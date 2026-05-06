import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.tOrder.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        details: {
          orderBy: { lineNo: "asc" },
          include: { part: { select: { id: true, code: true, name: true, unit: true, unitPrice: true } } },
        },
        receives: true,
      },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return Response.json(order);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    const existing = await prisma.tOrder.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const { status, desiredDate, deliveryAddr, paymentTerms, notes, expectedDeliveryDate, newComment, detailUpdate, replaceComments } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (desiredDate !== undefined) data.desiredDate = new Date(desiredDate);
    if (deliveryAddr !== undefined) data.deliveryAddr = deliveryAddr;
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;

    // Handle extended notes with comments and expected delivery date
    if (notes !== undefined || expectedDeliveryDate !== undefined || newComment || replaceComments !== undefined) {
      let meta: { expectedDeliveryDate?: string | null; comments?: { text: string; ts: string; user?: string }[] } = {};
      try {
        if (existing.notes && existing.notes.startsWith('{')) {
          meta = JSON.parse(existing.notes);
        }
      } catch { /* not JSON, ignore */ }
      if (expectedDeliveryDate !== undefined) meta.expectedDeliveryDate = expectedDeliveryDate;
      if (replaceComments !== undefined) {
        meta.comments = replaceComments;
      } else if (newComment) {
        if (!meta.comments) meta.comments = [];
        meta.comments.unshift(newComment);
      }
      if (notes !== undefined && !expectedDeliveryDate && !newComment) {
        data.notes = notes;
      } else {
        data.notes = JSON.stringify(meta);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If cancelling an awaiting order, release onOrder
      if (status === 'cancelled' && existing.status === 'awaiting') {
        const details = await tx.tOrderDetail.findMany({ where: { orderId: numId } });
        for (const d of details) {
          const remaining = d.qty - d.receivedQty;
          if (remaining > 0 && d.remarks !== 'manufacturer_shortage') {
            const part = await tx.mPart.findUnique({ where: { id: d.partId }, select: { defaultLocId: true } });
            if (part?.defaultLocId) {
              const stock = await tx.tStock.findUnique({ where: { partId_locationId: { partId: d.partId, locationId: part.defaultLocId } } });
              if (stock && stock.onOrder > 0) {
                await tx.tStock.update({ where: { partId_locationId: { partId: d.partId, locationId: part.defaultLocId } }, data: { onOrder: { decrement: Math.min(remaining, stock.onOrder) } } });
              }
            }
          }
        }
      }

      const order = await tx.tOrder.update({ where: { id: numId }, data });

      // Update individual order detail if requested
      if (detailUpdate?.detailId) {
        await tx.tOrderDetail.update({
          where: { id: Number(detailUpdate.detailId) },
          data: { remarks: detailUpdate.remarks || null },
        });
      }

      await tx.tLog.create({
        data: {
          category: "order",
          action: "update",
          targetType: "TOrder",
          targetId: id,
          userId: 1,
          description: `Updated order ${order.orderNo}`,
          beforeData: existing as object,
          afterData: order as object,
        },
      });

      return order;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update order" }, { status: 500 });
  }
}

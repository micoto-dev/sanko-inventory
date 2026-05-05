import { prisma } from "@/server/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { id, detailId } = await params;
    const orderId = Number(id);
    const detId = Number(detailId);

    const detail = await prisma.tOrderDetail.findFirst({
      where: { id: detId, orderId },
      include: { order: true },
    });

    if (!detail) {
      return Response.json({ error: { message: "Order detail not found" } }, { status: 404 });
    }

    const remaining = detail.qty - detail.receivedQty;
    if (remaining <= 0) {
      return Response.json({ error: { message: "This item is already fully received" } }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark this detail as manufacturer shortage via remarks
      const updated = await tx.tOrderDetail.update({
        where: { id: detId },
        data: { remarks: "manufacturer_shortage" },
      });

      // Remove onOrder qty from stock for this part
      const part = await tx.mPart.findUnique({
        where: { id: detail.partId },
        select: { defaultLocId: true },
      });
      const locId = part?.defaultLocId;
      if (locId) {
        const stock = await tx.tStock.findUnique({
          where: { partId_locationId: { partId: detail.partId, locationId: locId } },
        });
        if (stock) {
          await tx.tStock.update({
            where: { partId_locationId: { partId: detail.partId, locationId: locId } },
            data: {
              onOrder: { decrement: Math.min(remaining, stock.onOrder) },
            },
          });
        }
      }

      await tx.tLog.create({
        data: {
          category: "order",
          action: "item_shortage",
          targetType: "TOrderDetail",
          targetId: String(detId),
          description: `Marked order detail #${detId} (part ${detail.partId}) as manufacturer shortage on order ${detail.order.orderNo}`,
        },
      });

      return updated;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to mark item shortage" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { id, detailId } = await params;
    const orderId = Number(id);
    const detId = Number(detailId);

    const detail = await prisma.tOrderDetail.findFirst({
      where: { id: detId, orderId },
      include: { order: true },
    });

    if (!detail) {
      return Response.json({ error: { message: "Order detail not found" } }, { status: 404 });
    }

    const remaining = detail.qty - detail.receivedQty;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.tOrderDetail.update({
        where: { id: detId },
        data: { remarks: null },
      });

      // Restore onOrder qty
      const part = await tx.mPart.findUnique({
        where: { id: detail.partId },
        select: { defaultLocId: true },
      });
      const locId = part?.defaultLocId;
      if (locId && remaining > 0) {
        await tx.tStock.upsert({
          where: { partId_locationId: { partId: detail.partId, locationId: locId } },
          create: { partId: detail.partId, locationId: locId, qty: 0, allocated: 0, onOrder: remaining },
          update: { onOrder: { increment: remaining } },
        });
      }

      await tx.tLog.create({
        data: {
          category: "order",
          action: "item_shortage_cancel",
          targetType: "TOrderDetail",
          targetId: String(detId),
          description: `欠品取消: 発注明細 #${detId} (部品 ${detail.partId}) / 発注 ${detail.order.orderNo}`,
        },
      });

      return updated;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to cancel item shortage" } }, { status: 500 });
  }
}

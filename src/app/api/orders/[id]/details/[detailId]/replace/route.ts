import { prisma } from "@/server/db";

// 振替発注の作成: メーカー欠品の発注明細から、別仕入先への新規発注を作成し、
// 振替先の発注明細に元明細のID（replacesDetailId）をリンクする。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { id, detailId } = await params;
    const orderId = Number(id);
    const origDetailId = Number(detailId);
    const body = await request.json();
    const {
      supplierId,
      qty: qtyInput,
      unitPrice: unitPriceInput,
      desiredDate,
      orderDate,
      createdById,
      notes,
    } = body as {
      supplierId?: number;
      qty?: number;
      unitPrice?: number;
      desiredDate?: string;
      orderDate?: string;
      createdById?: number;
      notes?: string;
    };

    if (!supplierId) {
      return Response.json({ error: { message: "supplierId is required" } }, { status: 400 });
    }

    const origDetail = await prisma.tOrderDetail.findUnique({
      where: { id: origDetailId },
      include: { order: true },
    });

    if (!origDetail || origDetail.orderId !== orderId) {
      return Response.json({ error: { message: "Original order detail not found" } }, { status: 404 });
    }

    if (supplierId === origDetail.order.supplierId) {
      return Response.json({ error: { message: "振替先は元発注と異なる仕入先を選んでください" } }, { status: 400 });
    }

    const remaining = origDetail.qty - origDetail.receivedQty;
    if (remaining <= 0) {
      return Response.json({ error: { message: "残数が無い明細は振替できません" } }, { status: 400 });
    }

    const qty = qtyInput && qtyInput > 0 ? Math.min(qtyInput, remaining) : remaining;
    const unitPrice = unitPriceInput && unitPriceInput >= 0 ? unitPriceInput : origDetail.unitPrice;
    const userId = createdById || 1;

    const result = await prisma.$transaction(async (tx) => {
      // orderNo 採番（既存 POST /api/orders と同じパターン）
      const year = new Date().getFullYear();
      const prefix = `PO-${year}-`;
      const lastOrder = await tx.tOrder.findFirst({
        where: { orderNo: { startsWith: prefix } },
        orderBy: { orderNo: "desc" },
      });
      let seq = 1;
      if (lastOrder) {
        const lastSeq = parseInt(lastOrder.orderNo.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      const orderNo = `${prefix}${String(seq).padStart(4, "0")}`;

      const newOrder = await tx.tOrder.create({
        data: {
          orderNo,
          supplierId,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          desiredDate: desiredDate
            ? new Date(desiredDate)
            : (origDetail.order.desiredDate || undefined),
          totalQty: qty,
          totalAmount: qty * unitPrice,
          notes: notes || `振替元: ${origDetail.order.orderNo} (明細#${origDetail.lineNo})`,
          createdById: userId,
          status: "draft",
          details: {
            create: [
              {
                lineNo: 1,
                partId: origDetail.partId,
                qty,
                unitPrice,
                replacesDetailId: origDetail.id,
              },
            ],
          },
        },
        include: {
          details: true,
          supplier: { select: { id: true, name: true, code: true } },
        },
      });

      // 元明細をメーカー欠品マークしておく（まだの場合）
      if (origDetail.remarks !== "manufacturer_shortage") {
        await tx.tOrderDetail.update({
          where: { id: origDetail.id },
          data: { remarks: "manufacturer_shortage" },
        });
      }

      await tx.tLog.create({
        data: {
          category: "order",
          action: "replace",
          targetType: "TOrder",
          targetId: String(newOrder.id),
          userId,
          description: `Created replacement order ${orderNo} for shortage in ${origDetail.order.orderNo} (line ${origDetail.lineNo}, part ${origDetail.partId})`,
        },
      });

      return newOrder;
    });

    return Response.json({
      id: result.id,
      orderNo: result.orderNo,
      supplier: result.supplier?.name || "",
      supplierId: result.supplierId,
      status: result.status,
      details: result.details.map((d) => ({
        id: d.id,
        partId: d.partId,
        qty: Number(d.qty),
        unitPrice: Number(d.unitPrice),
        replacesDetailId: d.replacesDetailId,
      })),
    });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: { message: "Failed to create replacement order" } },
      { status: 500 }
    );
  }
}

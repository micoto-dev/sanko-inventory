import { prisma } from "@/server/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    const order = await prisma.tOrder.findUnique({
      where: { id: numId },
      include: { details: true },
    });

    if (!order) {
      return Response.json({ error: { message: "Order not found" } }, { status: 404 });
    }

    if (!["awaiting", "partial", "ordered", "approved"].includes(order.status)) {
      return Response.json(
        { error: { message: "Only active orders can be marked as manufacturer shortage" } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order status to manufacturer_shortage
      const updated = await tx.tOrder.update({
        where: { id: numId },
        data: { status: "manufacturer_shortage" },
      });

      // Remove onOrder qty from stock for each detail line
      for (const detail of order.details) {
        const remaining = detail.qty - detail.receivedQty;
        if (remaining <= 0) continue;

        const part = await tx.mPart.findUnique({
          where: { id: detail.partId },
          select: { defaultLocId: true },
        });
        const locId = part?.defaultLocId;
        if (!locId) continue;

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
          action: "manufacturer_shortage",
          targetType: "TOrder",
          targetId: id,
          description: `Marked order ${order.orderNo} as manufacturer shortage`,
        },
      });

      return updated;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to mark manufacturer shortage" } }, { status: 500 });
  }
}

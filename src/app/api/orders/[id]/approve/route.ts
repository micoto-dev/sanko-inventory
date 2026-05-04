import { prisma } from "@/server/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();
    const { approvedById } = body;

    if (!approvedById) {
      return Response.json({ error: "approvedById is required" }, { status: 400 });
    }

    const order = await prisma.tOrder.findUnique({
      where: { id: numId },
      include: { details: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "draft") {
      return Response.json({ error: "Only draft orders can be approved" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.tOrder.update({
        where: { id: numId },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedById,
        },
      });

      // Add on_order qty to stock for each detail line
      for (const detail of order.details) {
        // Find part's default location
        const part = await tx.mPart.findUnique({
          where: { id: detail.partId },
          select: { defaultLocId: true },
        });
        const locId = part?.defaultLocId;
        if (!locId) continue;

        await tx.tStock.upsert({
          where: { partId_locationId: { partId: detail.partId, locationId: locId } },
          create: {
            partId: detail.partId,
            locationId: locId,
            qty: 0,
            allocated: 0,
            onOrder: detail.qty,
          },
          update: {
            onOrder: { increment: detail.qty },
          },
        });
      }

      await tx.tLog.create({
        data: {
          category: "order",
          action: "approve",
          targetType: "TOrder",
          targetId: id,
          description: `Approved order ${order.orderNo}`,
          userId: approvedById,
        },
      });

      return updated;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to approve order" }, { status: 500 });
  }
}

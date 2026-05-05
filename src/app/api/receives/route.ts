import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, receivedById } = body;

    if (!receivedById || !items?.length) {
      return Response.json({ error: "receivedById and items are required" }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const receives = [];

      for (const item of items as {
        orderId?: number;
        orderDetailId?: number;
        partId: string;
        locationId: string;
        qty: number;
        result?: string;
        rejectReason?: string;
      }[]) {
        // Generate receiveNo
        const count = await tx.tReceive.count();
        const receiveNo = `RC-${String(count + 1).padStart(6, "0")}`;

        const receive = await tx.tReceive.create({
          data: {
            receiveNo,
            orderId: item.orderId,
            orderDetailId: item.orderDetailId,
            partId: item.partId,
            locationId: item.locationId,
            qty: item.qty,
            result: item.result || "ok",
            rejectReason: item.rejectReason,
            receivedById,
          },
        });
        receives.push(receive);

        // Update stock: increase qty, decrease on_order
        await tx.tStock.upsert({
          where: { partId_locationId: { partId: item.partId, locationId: item.locationId } },
          create: {
            partId: item.partId,
            locationId: item.locationId,
            qty: item.qty,
            allocated: 0,
            onOrder: 0,
            lastInoutAt: new Date(),
          },
          update: {
            qty: { increment: item.qty },
            onOrder: { decrement: item.qty },
            lastInoutAt: new Date(),
          },
        });

        // Update order detail received_qty if linked
        if (item.orderDetailId) {
          await tx.tOrderDetail.update({
            where: { id: item.orderDetailId },
            data: { receivedQty: { increment: item.qty } },
          });
        }

        await tx.tLog.create({
          data: {
            category: "receive",
            action: "receive",
            targetType: "TReceive",
            targetId: String(receive.id),
            description: `Received ${item.qty} of part ${item.partId} at ${item.locationId}`,
            userId: receivedById,
          },
        });
      }

      // Update order status based on received quantities
      const orderIds = [...new Set((items as any[]).map(i => i.orderId).filter(Boolean))] as number[];
      for (const orderId of orderIds) {
        const orderDetails = await tx.tOrderDetail.findMany({ where: { orderId: Number(orderId) } });
        const allComplete = orderDetails.every(d => d.receivedQty >= d.qty);
        const anyReceived = orderDetails.some(d => d.receivedQty > 0);
        if (allComplete) {
          await tx.tOrder.update({ where: { id: orderId }, data: { status: 'completed' } });
        } else if (anyReceived) {
          await tx.tOrder.update({ where: { id: orderId }, data: { status: 'partial' } });
        }
      }

      return receives;
    });

    return Response.json(results, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to process receives" }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

const ALLOWED_REASONS = new Set(["shortage", "defective", "damaged", "other"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { id, detailId } = await params;
    const orderId = Number(id);
    const detId = Number(detailId);
    const body = await request.json();
    const { qty, reason, reasonNote, expectedDate, createdById } = body;

    if (!qty || qty <= 0) {
      return Response.json({ error: { message: "qty must be positive" } }, { status: 400 });
    }
    if (!reason || !ALLOWED_REASONS.has(reason)) {
      return Response.json({ error: { message: "invalid reason" } }, { status: 400 });
    }

    const detail = await prisma.tOrderDetail.findFirst({ where: { id: detId, orderId } });
    if (!detail) {
      return Response.json({ error: { message: "Order detail not found" } }, { status: 404 });
    }

    const shortage = await prisma.tOrderDetailShortage.create({
      data: {
        orderDetailId: detId,
        qty,
        reason,
        reasonNote: reasonNote || null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        createdById: createdById || 1,
      },
    });

    await prisma.tLog.create({
      data: {
        category: "order",
        action: "shortage_create",
        targetType: "TOrderDetailShortage",
        targetId: String(shortage.id),
        userId: createdById || 1,
        description: `Shortage logged for detail #${detId}: qty=${qty}, reason=${reason}`,
      },
    });

    return Response.json(shortage, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to create shortage" } }, { status: 500 });
  }
}

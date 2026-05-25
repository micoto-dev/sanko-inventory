import { prisma } from "@/server/db";

const ALLOWED_STATUS = new Set(["pending", "resolved", "cancelled"]);
const ALLOWED_REASONS = new Set(["shortage", "defective", "damaged", "other"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; detailId: string; shortageId: string }> }
) {
  try {
    const { id, detailId, shortageId } = await params;
    const orderId = Number(id);
    const detId = Number(detailId);
    const sid = Number(shortageId);
    const body = await request.json();

    const existing = await prisma.tOrderDetailShortage.findFirst({
      where: { id: sid, orderDetailId: detId, orderDetail: { orderId } },
    });
    if (!existing) {
      return Response.json({ error: { message: "Shortage not found" } }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.qty === "number" && body.qty > 0) data.qty = body.qty;
    if (typeof body.reason === "string" && ALLOWED_REASONS.has(body.reason)) data.reason = body.reason;
    if (typeof body.reasonNote === "string" || body.reasonNote === null) data.reasonNote = body.reasonNote;
    if (typeof body.expectedDate === "string" || body.expectedDate === null) {
      data.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status)) {
      data.status = body.status;
      data.resolvedAt = body.status === "resolved" ? new Date() : null;
    }

    const updated = await prisma.tOrderDetailShortage.update({ where: { id: sid }, data });

    await prisma.tLog.create({
      data: {
        category: "order",
        action: "shortage_update",
        targetType: "TOrderDetailShortage",
        targetId: String(sid),
        userId: 1,
        description: `Shortage updated: ${JSON.stringify(data)}`,
      },
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to update shortage" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; detailId: string; shortageId: string }> }
) {
  try {
    const { id, detailId, shortageId } = await params;
    const orderId = Number(id);
    const detId = Number(detailId);
    const sid = Number(shortageId);

    const existing = await prisma.tOrderDetailShortage.findFirst({
      where: { id: sid, orderDetailId: detId, orderDetail: { orderId } },
    });
    if (!existing) {
      return Response.json({ error: { message: "Shortage not found" } }, { status: 404 });
    }

    await prisma.tOrderDetailShortage.delete({ where: { id: sid } });

    await prisma.tLog.create({
      data: {
        category: "order",
        action: "shortage_delete",
        targetType: "TOrderDetailShortage",
        targetId: String(sid),
        userId: 1,
        description: `Shortage deleted for detail #${detId}`,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: { message: "Failed to delete shortage" } }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

const ALLOWED_STATUS = new Set(["pending", "in_progress", "done"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  try {
    const { id, stageId } = await params;
    const prodOrderId = Number(id);
    const sId = Number(stageId);
    const body = await request.json();

    const existing = await prisma.tProdOrderStage.findUnique({
      where: { prodOrderId_stageId: { prodOrderId, stageId: sId } },
    });
    if (!existing) {
      // Create on first edit
      await prisma.tProdOrderStage.create({
        data: { prodOrderId, stageId: sId },
      });
    }

    const data: Record<string, unknown> = {};
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status)) data.status = body.status;

    const updated = await prisma.tProdOrderStage.update({
      where: { prodOrderId_stageId: { prodOrderId, stageId: sId } },
      data,
    });
    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update order stage" }, { status: 400 });
  }
}

import { prisma } from "@/server/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    const updated = await prisma.mProductionTask.update({
      where: { id: Number(taskId) },
      data,
    });
    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update task" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const { taskId } = await params;
    await prisma.mProductionTask.delete({ where: { id: Number(taskId) } });
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete task" }, { status: 400 });
  }
}

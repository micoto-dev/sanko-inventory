import { prisma } from "@/server/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stageId = Number(id);
    const body = await request.json();
    const { name, sortOrder } = body;
    if (!name) return Response.json({ error: "name is required" }, { status: 400 });
    const maxOrder = await prisma.mProductionTask.aggregate({
      where: { stageId },
      _max: { sortOrder: true },
    });
    const nextOrder = sortOrder ?? ((maxOrder._max.sortOrder ?? 0) + 1);
    const task = await prisma.mProductionTask.create({
      data: { stageId, name, sortOrder: nextOrder },
    });
    return Response.json(task, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create task" }, { status: 400 });
  }
}

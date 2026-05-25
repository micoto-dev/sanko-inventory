import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prodOrderId = Number(id);
    const checks = await prisma.tProdOrderTaskCheck.findMany({
      where: { prodOrderId },
      include: { checkedBy: { select: { id: true, name: true } } },
    });
    return Response.json({ data: checks });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch task checks" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prodOrderId = Number(id);
    const body = await request.json();
    const { taskId, isChecked, checkedById } = body;
    if (!taskId || typeof isChecked !== "boolean") {
      return Response.json({ error: "taskId and isChecked are required" }, { status: 400 });
    }
    const userId = checkedById || 1;
    const check = await prisma.tProdOrderTaskCheck.upsert({
      where: { prodOrderId_taskId: { prodOrderId, taskId: Number(taskId) } },
      create: {
        prodOrderId,
        taskId: Number(taskId),
        isChecked,
        checkedAt: isChecked ? new Date() : null,
        checkedById: isChecked ? userId : null,
      },
      update: {
        isChecked,
        checkedAt: isChecked ? new Date() : null,
        checkedById: isChecked ? userId : null,
      },
    });
    return Response.json(check);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to upsert task check" }, { status: 400 });
  }
}

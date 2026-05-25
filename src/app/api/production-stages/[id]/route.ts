import { prisma } from "@/server/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.color === "string") data.color = body.color;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    const updated = await prisma.mProductionStage.update({
      where: { id: Number(id) },
      data,
    });
    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update stage" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.mProductionStage.delete({ where: { id: Number(id) } });
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete stage" }, { status: 400 });
  }
}

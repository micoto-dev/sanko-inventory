import { prisma } from "@/server/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, aliases, category, description, entityType } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (entityType !== undefined) updateData.entityType = entityType;
    if (aliases !== undefined) {
      const existing = await prisma.mEntity.findUnique({ where: { id: Number(id) } });
      updateData.metadata = { ...(existing?.metadata as any || {}), aliases };
    }

    const entity = await prisma.mEntity.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return Response.json({ data: entity });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update entity master" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.mEntity.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete entity master" }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entity = await prisma.mEntity.findUnique({
      where: { id: Number(id) },
    });

    if (!entity || !entity.isActive) {
      return Response.json({ error: "Entity not found" }, { status: 404 });
    }

    return Response.json({
      id: entity.id,
      entityType: entity.entityType,
      name: entity.name,
      code: entity.code,
      category: entity.category,
      description: entity.description,
      metadata: entity.metadata,
      sourceDoc: entity.sourceDoc,
      isVerified: entity.isVerified,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch entity" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entityId = Number(id);
    const body = await request.json();
    const { entityType, name, code, category, description, metadata, sourceDoc, isVerified } = body;

    const existing = await prisma.mEntity.findUnique({ where: { id: entityId } });
    if (!existing || !existing.isActive) {
      return Response.json({ error: "Entity not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (entityType !== undefined) updateData.entityType = entityType;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (sourceDoc !== undefined) updateData.sourceDoc = sourceDoc;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.mEntity.update({
        where: { id: entityId },
        data: updateData,
      });

      await tx.tLog.create({
        data: {
          category: "entity",
          action: "update",
          targetType: "MEntity",
          targetId: String(entityId),
          description: `Updated entity ${existing.name}`,
          beforeData: existing as object,
          afterData: entity as object,
        },
      });

      return entity;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update entity" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entityId = Number(id);

    const existing = await prisma.mEntity.findUnique({ where: { id: entityId } });
    if (!existing || !existing.isActive) {
      return Response.json({ error: "Entity not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.mEntity.update({
        where: { id: entityId },
        data: { isActive: false },
      });

      await tx.tLog.create({
        data: {
          category: "entity",
          action: "soft_delete",
          targetType: "MEntity",
          targetId: String(entityId),
          description: `Soft-deleted entity ${existing.name}`,
          beforeData: { isActive: true } as object,
          afterData: { isActive: false } as object,
        },
      });

      return entity;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete entity" }, { status: 500 });
  }
}

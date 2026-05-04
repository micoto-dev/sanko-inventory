import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const q = searchParams.get("q") || "";
    const verified = searchParams.get("verified");

    const where: Record<string, unknown> = { isActive: true };
    if (type) {
      where.entityType = type;
    }
    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }
    if (verified !== null && verified !== "") {
      where.isVerified = verified === "true";
    }

    const entities = await prisma.mEntity.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = entities.map((e) => ({
      id: e.id,
      entityType: e.entityType,
      name: e.name,
      code: e.code,
      category: e.category,
      description: e.description,
      metadata: e.metadata,
      sourceDoc: e.sourceDoc,
      isVerified: e.isVerified,
      isActive: e.isActive,
      createdAt: e.createdAt,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch entities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, name, code, category, description, metadata, sourceDoc } = body;

    if (!entityType || !name) {
      return Response.json(
        { error: "entityType and name are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.mEntity.create({
        data: {
          entityType,
          name,
          code: code || null,
          category: category || null,
          description: description || null,
          metadata: metadata || null,
          sourceDoc: sourceDoc || null,
        },
      });

      await tx.tLog.create({
        data: {
          category: "entity",
          action: "create",
          targetType: "MEntity",
          targetId: String(entity.id),
          description: `Created entity ${entityType}: ${name}`,
          afterData: entity as object,
        },
      });

      return entity;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create entity" }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.entityType = type;

    // Entity masters are entities with isVerified=true used as canonical references
    const masters = await prisma.mEntity.findMany({
      where: { ...where, isVerified: true },
      orderBy: { name: "asc" },
    });

    const data = masters.map((m: any) => ({
      id: m.id,
      entityType: m.entityType,
      name: m.name,
      code: m.code,
      category: m.category,
      description: m.description,
      aliases: m.metadata?.aliases || [],
      metadata: m.metadata,
      isActive: m.isActive,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch entity masters" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, name, aliases, category, description } = body;

    if (!entityType || !name) {
      return Response.json({ error: "entityType and name are required" }, { status: 400 });
    }

    const entity = await prisma.mEntity.create({
      data: {
        entityType,
        name,
        category,
        description,
        metadata: { aliases: aliases || [] },
        isVerified: true,
      },
    });

    return Response.json({ data: entity }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create entity master" }, { status: 500 });
  }
}

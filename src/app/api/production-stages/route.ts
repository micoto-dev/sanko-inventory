import { prisma } from "@/server/db";

export async function GET() {
  try {
    const stages = await prisma.mProductionStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });
    return Response.json({ data: stages });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch stages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, name, color, sortOrder } = body;
    if (!name || !color) {
      return Response.json({ error: "name and color are required" }, { status: 400 });
    }
    const finalKey = (key && String(key).trim())
      || `stage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const maxOrder = await prisma.mProductionStage.aggregate({ _max: { sortOrder: true } });
    const nextOrder = sortOrder ?? ((maxOrder._max.sortOrder ?? 0) + 1);
    const stage = await prisma.mProductionStage.create({
      data: { key: finalKey, name, color, sortOrder: nextOrder },
    });
    return Response.json(stage, { status: 201 });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Failed to create stage";
    return Response.json({ error: msg }, { status: 400 });
  }
}

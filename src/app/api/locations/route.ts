import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouse = searchParams.get("warehouse") || "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (warehouse) where.warehouse = warehouse;

    const locations = await prisma.mLocation.findMany({
      where,
      orderBy: { id: "asc" },
    });

    return Response.json({ data: locations });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, warehouse, shelf, col, row, side, name, maxQty, locType } = body;

    if (!id || !warehouse || !shelf || !col || !row || !name) {
      return Response.json({ error: "id, warehouse, shelf, col, row, and name are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const location = await tx.mLocation.create({
        data: { id, warehouse, shelf, col, row, side, name, maxQty, locType },
      });

      await tx.tLog.create({
        data: {
          category: "location",
          action: "create",
          targetType: "MLocation",
          targetId: id,
          description: `Created location ${name} (${id})`,
        },
      });

      return location;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create location" }, { status: 500 });
  }
}

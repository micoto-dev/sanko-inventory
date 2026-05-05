import { prisma } from "@/server/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.mLocation.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    const { warehouse, shelf, col, row, side, name, maxQty, locType, isActive } = body;

    const data: Record<string, unknown> = {};
    if (warehouse !== undefined) data.warehouse = warehouse;
    if (shelf !== undefined) data.shelf = shelf;
    if (col !== undefined) data.col = col;
    if (row !== undefined) data.row = row;
    if (side !== undefined) data.side = side;
    if (name !== undefined) data.name = name;
    if (maxQty !== undefined) data.maxQty = maxQty;
    if (locType !== undefined) data.locType = locType;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const location = await tx.mLocation.update({ where: { id }, data });

      await tx.tLog.create({
        data: {
          category: "location",
          action: "update",
          targetType: "MLocation",
          targetId: id,
          description: `Updated location ${location.name} (${id})`,
        },
      });

      return location;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.mLocation.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mLocation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.tLog.create({
        data: {
          category: "location",
          action: "delete",
          targetType: "MLocation",
          targetId: id,
          description: `Deleted location ${existing.name} (${id})`,
        },
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete location" }, { status: 500 });
  }
}

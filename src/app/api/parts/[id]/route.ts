import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const part = await prisma.mPart.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        stocks: {
          include: { location: { select: { id: true, name: true, warehouse: true } } },
        },
      },
    });
    if (!part) {
      return Response.json({ error: "Part not found" }, { status: 404 });
    }
    return Response.json(part);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch part" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.mPart.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Part not found" }, { status: 404 });
    }

    const {
      code, name, spec, category, maker, makerCode,
      supplierId, unit, unitPrice, leadTimeDays, reorderPoint,
      safetyStock, maxStock, defaultLocId, shortageReason, isActive,
      replacementId, isDiscontinued,
    } = body;

    const data: Record<string, unknown> = {};
    if (code !== undefined) data.code = code;
    if (name !== undefined) data.name = name;
    if (spec !== undefined) data.spec = spec;
    if (category !== undefined) data.category = category;
    if (maker !== undefined) data.maker = maker;
    if (makerCode !== undefined) data.makerCode = makerCode;
    if (supplierId !== undefined) data.supplierId = supplierId;
    if (unit !== undefined) data.unit = unit;
    if (unitPrice !== undefined) data.unitPrice = unitPrice;
    if (leadTimeDays !== undefined) data.leadTimeDays = leadTimeDays;
    if (reorderPoint !== undefined) data.reorderPoint = reorderPoint;
    if (safetyStock !== undefined) data.safetyStock = safetyStock;
    if (maxStock !== undefined) data.maxStock = maxStock;
    if (defaultLocId !== undefined) data.defaultLocId = defaultLocId;
    if (shortageReason !== undefined) data.shortageReason = shortageReason;
    if (isActive !== undefined) data.isActive = isActive;
    if (replacementId !== undefined) data.replacementId = replacementId;
    if (isDiscontinued !== undefined) data.isDiscontinued = isDiscontinued;

    const updated = await prisma.$transaction(async (tx) => {
      const part = await tx.mPart.update({ where: { id }, data });

      await tx.tLog.create({
        data: {
          category: "part",
          action: "update",
          targetType: "MPart",
          targetId: id,
          description: `Updated part ${part.code}`,
          beforeData: existing as object,
          afterData: part as object,
        },
      });

      return part;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update part" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.mPart.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Part not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mPart.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.tLog.create({
        data: {
          category: "part",
          action: "delete",
          targetType: "MPart",
          targetId: id,
          description: `Deleted part ${existing.code} - ${existing.name}`,
        },
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete part" }, { status: 500 });
  }
}

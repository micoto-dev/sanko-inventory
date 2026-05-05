import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.mProduct.findUnique({
      where: { id: Number(id) },
      include: {
        boms: {
          orderBy: { sortOrder: "asc" },
          include: {
            part: {
              select: { id: true, code: true, name: true, spec: true, unit: true, unitPrice: true, maker: true },
            },
          },
        },
      },
    });
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }
    return Response.json(product);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    const existing = await prisma.mProduct.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const { code, name, category, description, voltage, dimensions, drawingNo, isActive, updatedById, boms } = body;

    const data: Record<string, unknown> = {};
    if (code !== undefined) data.code = code;
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description;
    if (voltage !== undefined) data.voltage = voltage;
    if (dimensions !== undefined) data.dimensions = dimensions;
    if (drawingNo !== undefined) data.drawingNo = drawingNo;
    if (isActive !== undefined) data.isActive = isActive;
    if (updatedById !== undefined) data.updatedById = updatedById;

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.mProduct.update({ where: { id: numId }, data });

      if (boms !== undefined) {
        await tx.mBom.deleteMany({ where: { productId: numId } });
        if (boms.length > 0) {
          await tx.mBom.createMany({
            data: boms.map((b: { partId: string; qty: number; position?: string; note?: string; sortOrder?: number }, i: number) => ({
              productId: numId,
              partId: b.partId,
              qty: b.qty,
              position: b.position || null,
              note: b.note || null,
              sortOrder: b.sortOrder ?? i,
            })),
          });
        }
      }

      await tx.tLog.create({
        data: {
          category: "product",
          action: "update",
          targetType: "MProduct",
          targetId: id,
          userId: 1,
          description: `Updated product ${product.code}`,
          beforeData: existing as object,
          afterData: product as object,
        },
      });

      return product;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    const existing = await prisma.mProduct.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mProduct.update({
        where: { id: numId },
        data: { deletedAt: new Date() },
      });

      await tx.tLog.create({
        data: {
          category: "product",
          action: "delete",
          targetType: "MProduct",
          targetId: id,
          userId: 1,
          description: `Deleted product ${existing.code} - ${existing.name}`,
        },
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.mProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: "asc" },
        include: {
          boms: {
            select: { id: true, partId: true, qty: true, position: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.mProduct.count({ where }),
    ]);

    const data = products.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      description: p.description,
      voltage: p.voltage,
      dimensions: p.dimensions,
      drawingNo: p.drawingNo,
      isActive: p.isActive,
      boms: (p.boms || []).map((b: any) => ({
        id: b.id,
        partId: b.partId,
        qty: Number(b.qty),
        position: b.position,
      })),
    }));

    return Response.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, category, description, voltage, dimensions, drawingNo, boms } = body;

    if (!code || !name || !category) {
      return Response.json({ error: "code, name, and category are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.mProduct.create({
        data: {
          code, name, category, description, voltage, dimensions, drawingNo,
          boms: boms?.length
            ? {
                create: boms.map((b: { partId: string; qty: number; position?: string; note?: string; sortOrder?: number }, i: number) => ({
                  partId: b.partId,
                  qty: b.qty,
                  position: b.position,
                  note: b.note,
                  sortOrder: b.sortOrder ?? i,
                })),
              }
            : undefined,
        },
        include: { boms: true },
      });

      await tx.tLog.create({
        data: {
          category: "product",
          action: "create",
          targetType: "MProduct",
          targetId: String(product.id),
          userId: 1,
          description: `Created product ${code} - ${name}`,
        },
      });

      return product;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create product" }, { status: 500 });
  }
}

import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { maker: { contains: q, mode: "insensitive" } },
        { makerCode: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [parts, total] = await Promise.all([
      prisma.mPart.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: "asc" },
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          stocks: { select: { qty: true, allocated: true, onOrder: true, locationId: true } },
        },
      }),
      prisma.mPart.count({ where }),
    ]);

    const enriched = parts.map((part) => {
      const totalQty = part.stocks.reduce((s, st) => s + st.qty, 0);
      const totalAllocated = part.stocks.reduce((s, st) => s + st.allocated, 0);
      const totalOnOrder = part.stocks.reduce((s, st) => s + st.onOrder, 0);
      const effective = totalQty - totalAllocated;

      let computedStatus: string;
      if (part.shortageReason) {
        computedStatus = "manufacturer_shortage";
      } else if (totalQty === 0) {
        computedStatus = "shortage";
      } else if (effective < part.reorderPoint) {
        computedStatus = "low";
      } else if (part.maxStock > 0 && totalQty > part.maxStock) {
        computedStatus = "excess";
      } else {
        computedStatus = "normal";
      }

      return {
        id: part.id,
        code: part.code,
        name: part.name,
        spec: part.spec,
        category: part.category,
        maker: part.maker,
        makerCode: part.makerCode,
        supplier: part.supplier?.name || '',
        supplierId: part.supplierId,
        unit: part.unit,
        unitPrice: part.unitPrice,
        leadTime: part.leadTimeDays,
        reorderPoint: part.reorderPoint,
        safetyStock: part.safetyStock,
        maxStock: part.maxStock,
        location: part.defaultLocId || (part.stocks[0]?.locationId) || '',
        shortageReason: part.shortageReason,
        stock: totalQty,
        allocated: totalAllocated,
        onOrder: totalOnOrder,
        effective,
        status: computedStatus,
      };
    });

    const filtered = status ? enriched.filter((p) => p.status === status) : enriched;

    return Response.json({
      data: filtered,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch parts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      code, name, spec, category, maker, makerCode,
      supplierId, unit, unitPrice, leadTimeDays, leadTime, reorderPoint,
      safetyStock, maxStock, defaultLocId, shortageReason,
    } = body;

    if (!code || !name) {
      return Response.json({ error: "code and name are required" }, { status: 400 });
    }

    // Auto-generate part ID
    const lastPart = await prisma.mPart.findFirst({ orderBy: { id: 'desc' } });
    const lastNum = lastPart ? parseInt(lastPart.id.replace('PT', ''), 10) : 12344;
    const id = 'PT' + String(lastNum + 1).padStart(8, '0');

    const result = await prisma.$transaction(async (tx) => {
      const part = await tx.mPart.create({
        data: {
          id, code, name, spec, category, maker, makerCode,
          supplierId, unit, unitPrice: unitPrice || 0,
          leadTimeDays: leadTimeDays || leadTime || 14,
          reorderPoint: reorderPoint || 0,
          safetyStock: safetyStock || 0,
          maxStock: maxStock || 0,
          defaultLocId: defaultLocId || null,
          shortageReason,
        },
      });

      let stock = null;
      if (defaultLocId) {
        stock = await tx.tStock.create({
          data: { partId: id, locationId: defaultLocId, qty: 0, allocated: 0, onOrder: 0 },
        });
      }

      await tx.tLog.create({
        data: {
          category: "part",
          action: "create",
          targetType: "MPart",
          targetId: id,
          userId: 1,
          description: `Created part ${code} - ${name}`,
          afterData: part as object,
        },
      });

      return { part, stock };
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create part" }, { status: 500 });
  }
}

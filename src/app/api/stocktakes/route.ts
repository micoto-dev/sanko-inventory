import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [stocktakes, total] = await Promise.all([
      prisma.tStocktake.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          _count: { select: { details: true } },
        },
      }),
      prisma.tStocktake.count({ where }),
    ]);

    return Response.json({
      data: stocktakes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch stocktakes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { warehouse, startDate, notes, createdById } = body;

    if (!startDate || !createdById) {
      return Response.json({ error: "startDate and createdById are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate stocktakeNo
      const count = await tx.tStocktake.count();
      const stocktakeNo = `ST-${String(count + 1).padStart(6, "0")}`;

      // Get current stock records (optionally filtered by warehouse)
      const stockWhere: Record<string, unknown> = {};
      if (warehouse) {
        stockWhere.location = { warehouse };
      }
      const stocks = await tx.tStock.findMany({
        where: stockWhere,
        include: { location: { select: { warehouse: true } } },
      });

      const stocktake = await tx.tStocktake.create({
        data: {
          stocktakeNo,
          warehouse,
          startDate: new Date(startDate),
          notes,
          createdById,
          details: {
            create: stocks.map((s) => ({
              partId: s.partId,
              locationId: s.locationId,
              bookQty: s.qty,
            })),
          },
        },
        include: { details: true },
      });

      await tx.tLog.create({
        data: {
          category: "stocktake",
          action: "create",
          targetType: "TStocktake",
          targetId: String(stocktake.id),
          description: `Created stocktake ${stocktakeNo} with ${stocks.length} items`,
          userId: createdById,
        },
      });

      return stocktake;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create stocktake" }, { status: 500 });
  }
}

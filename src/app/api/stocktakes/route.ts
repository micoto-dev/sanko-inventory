import { prisma } from "@/server/db";

export async function GET() {
  try {
    const stocktakes = await prisma.tStocktake.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        _count: { select: { details: true } },
        details: {
          include: {
            part: { select: { id: true, code: true, name: true, costPrice: true, sellingPrice: true } },
            countedBy: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    return Response.json({ data: stocktakes });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch stocktakes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { warehouse, startDate, locationId, items } = body;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.tStocktake.count();
      const stocktakeNo = `ST-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      const stocktake = await tx.tStocktake.create({
        data: {
          stocktakeNo,
          status: 'approved',
          warehouse: warehouse || null,
          startDate: new Date(startDate || new Date()),
          createdById: 1,
          approvedAt: new Date(),
          approvedById: 1,
          details: {
            create: (items || []).map((item: any) => ({
              partId: item.partId,
              locationId: item.locationId || locationId,
              bookQty: item.bookQty,
              actualQty: item.actualQty,
              diffQty: item.diffQty,
              approved: true,
              countedAt: new Date(),
              countedById: 1,
            })),
          },
        },
      });

      // Update stock quantities based on actual counts
      for (const item of (items || []) as { partId: string; locationId?: string; actualQty: number; diffQty: number }[]) {
        const locId = item.locationId || locationId;
        if (item.diffQty !== 0 && locId) {
          const stock = await tx.tStock.findUnique({
            where: { partId_locationId: { partId: item.partId, locationId: locId } },
          });
          if (stock) {
            await tx.tStock.update({
              where: { partId_locationId: { partId: item.partId, locationId: locId } },
              data: { qty: item.actualQty, lastInoutAt: new Date() },
            });
          }
        }
      }

      await tx.tLog.create({
        data: {
          category: "stocktake",
          action: "approve",
          targetType: "TStocktake",
          targetId: String(stocktake.id),
          userId: 1,
          description: `棚卸し ${stocktakeNo} (${locationId || warehouse || '全体'}) ${items?.length || 0}品目の実査結果を承認・在庫更新`,
        },
      });

      return stocktake;
    });

    return Response.json({ data: result }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create stocktake" }, { status: 500 });
  }
}

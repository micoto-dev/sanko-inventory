import { prisma } from "@/server/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();
    const { approvedById } = body;

    if (!approvedById) {
      return Response.json({ error: "approvedById is required" }, { status: 400 });
    }

    const stocktake = await prisma.tStocktake.findUnique({
      where: { id: numId },
      include: { details: true },
    });

    if (!stocktake) {
      return Response.json({ error: "Stocktake not found" }, { status: 404 });
    }
    if (stocktake.status !== "open") {
      return Response.json({ error: "Only open stocktakes can be approved" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Adjust stock by diff_qty for each detail that has been counted
      for (const detail of stocktake.details) {
        if (detail.diffQty == null || detail.actualQty == null) continue;

        await tx.tStock.update({
          where: { partId_locationId: { partId: detail.partId, locationId: detail.locationId } },
          data: {
            qty: { increment: detail.diffQty },
            lastInoutAt: new Date(),
          },
        });

        await tx.tStocktakeDetail.update({
          where: { id: detail.id },
          data: { approved: true },
        });
      }

      const updated = await tx.tStocktake.update({
        where: { id: numId },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedById,
          endDate: new Date(),
        },
      });

      await tx.tLog.create({
        data: {
          category: "stocktake",
          action: "approve",
          targetType: "TStocktake",
          targetId: id,
          description: `Approved stocktake ${stocktake.stocktakeNo}, adjusted ${stocktake.details.filter((d) => d.diffQty != null).length} items`,
          userId: approvedById,
        },
      });

      return updated;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to approve stocktake" }, { status: 500 });
  }
}

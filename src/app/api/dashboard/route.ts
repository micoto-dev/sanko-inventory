import { prisma } from "@/server/db";

export async function GET() {
  try {
    // Fetch all active parts with stock data in one query
    const parts = await prisma.mPart.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        unitPrice: true,
        reorderPoint: true,
        maxStock: true,
        shortageReason: true,
        stocks: { select: { qty: true, allocated: true, onOrder: true } },
      },
    });

    let totalStockValue = 0;
    let lowStockCount = 0;
    let mfrShortageCount = 0;
    const alerts: { type: string; partId: string; partCode: string; partName: string; message: string }[] = [];

    for (const part of parts) {
      const totalQty = part.stocks.reduce((s, st) => s + st.qty, 0);
      const totalAllocated = part.stocks.reduce((s, st) => s + st.allocated, 0);
      const effective = totalQty - totalAllocated;

      totalStockValue += totalQty * part.unitPrice;

      if (part.shortageReason) {
        mfrShortageCount++;
        alerts.push({
          type: "manufacturer_shortage",
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          message: `Manufacturer shortage: ${part.shortageReason}`,
        });
      } else if (totalQty === 0) {
        lowStockCount++;
        alerts.push({
          type: "shortage",
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          message: "Out of stock",
        });
      } else if (effective < part.reorderPoint) {
        lowStockCount++;
        alerts.push({
          type: "low",
          partId: part.id,
          partCode: part.code,
          partName: part.name,
          message: `Low stock: effective ${effective} < reorder point ${part.reorderPoint}`,
        });
      }
    }

    // Active orders (approved/ordered status) total amount
    const activeOrders = await prisma.tOrder.aggregate({
      where: { status: { in: ["approved", "ordered"] } },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Recent logs as activity feed
    const recentLogs = await prisma.tLog.findMany({
      take: 10,
      orderBy: { ts: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return Response.json({
      totalStockValue,
      lowStockCount,
      mfrShortageCount,
      activeOrdersCount: activeOrders._count,
      activeOrdersAmount: activeOrders._sum.totalAmount || 0,
      recentAlerts: alerts.slice(0, 20),
      recentActivity: recentLogs,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

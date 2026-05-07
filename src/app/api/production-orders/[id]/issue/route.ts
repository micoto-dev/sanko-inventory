import { prisma } from "@/server/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();
    const { items, issuedById } = body;

    if (!issuedById || !items?.length) {
      return Response.json({ error: "issuedById and items are required" }, { status: 400 });
    }

    const prodOrder = await prisma.tProdOrder.findUnique({ where: { id: numId } });
    if (!prodOrder) {
      return Response.json({ error: "Production order not found" }, { status: 404 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const issues = [];

      for (const item of items as {
        partId: string;
        locationId: string;
        qty: number;
        notes?: string;
      }[]) {
        // Generate issueNo
        const count = await tx.tIssue.count();
        const issueNo = `IS-${String(count + 1).padStart(6, "0")}`;

        const issue = await tx.tIssue.create({
          data: {
            issueNo,
            prodOrderId: numId,
            partId: item.partId,
            locationId: item.locationId,
            qty: item.qty,
            issueType: "production",
            issuedById,
            notes: item.notes,
          },
        });
        issues.push(issue);

        // Reduce stock qty and allocated (prevent negative)
        // If locationId is missing, try to find any stock for this part
        let stockLocId = item.locationId;
        if (!stockLocId || stockLocId === '-' || stockLocId === 'A-03-2-L') {
          const anyStock = await tx.tStock.findFirst({ where: { partId: item.partId, qty: { gt: 0 } } });
          if (anyStock) stockLocId = anyStock.locationId;
        }

        const currentStock = stockLocId ? await tx.tStock.findUnique({
          where: { partId_locationId: { partId: item.partId, locationId: stockLocId } },
        }) : null;

        if (currentStock && currentStock.qty >= item.qty) {
          await tx.tStock.update({
            where: { partId_locationId: { partId: item.partId, locationId: stockLocId } },
            data: {
              qty: { decrement: item.qty },
              allocated: { decrement: Math.min(item.qty, currentStock.allocated) },
              lastInoutAt: new Date(),
            },
          });
        } else if (currentStock) {
          // 在庫不足でも0まで減らす
          await tx.tStock.update({
            where: { partId_locationId: { partId: item.partId, locationId: stockLocId } },
            data: {
              qty: 0,
              allocated: 0,
              lastInoutAt: new Date(),
            },
          });
        }
        // 在庫レコードがない場合はスキップ（ロケーション未設定の部品）

        // Increase picked_qty in BOM snapshot
        await tx.tProdOrderBomSnapshot.update({
          where: { prodOrderId_partId: { prodOrderId: numId, partId: item.partId } },
          data: {
            pickedQty: { increment: item.qty },
          },
        });

        await tx.tLog.create({
          data: {
            category: "issue",
            action: "issue",
            targetType: "TIssue",
            targetId: String(issue.id),
          userId: 1,
            description: `Issued ${item.qty} of part ${item.partId} for production order ${prodOrder.prodNo}`,
          },
        });
      }

      // Update production order status
      const snapshots = await tx.tProdOrderBomSnapshot.findMany({ where: { prodOrderId: numId } });
      const allPicked = snapshots.every(s => Number(s.pickedQty) >= Number(s.totalQty));
      const anyPicked = snapshots.some(s => Number(s.pickedQty) > 0);
      if (allPicked) {
        await tx.tProdOrder.update({ where: { id: numId }, data: { status: 'completed', completedAt: new Date() } });
      } else if (anyPicked) {
        await tx.tProdOrder.update({ where: { id: numId }, data: { status: 'picking' } });
      }

      return issues;
    });

    return Response.json(results, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to issue items" }, { status: 500 });
  }
}

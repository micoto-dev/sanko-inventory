import { prisma } from "@/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "";

  try {
    let csvHeader = "";
    let csvRows: string[] = [];
    let title = "";

    if (type === "inventory") {
      title = "在庫一覧表";
      csvHeader = "品番,社内品番,品名,メーカー,在庫数,引当数,発注残,有効在庫,単価,在庫金額,保管場所,状態";
      const parts = await prisma.mPart.findMany({ where: { deletedAt: null }, include: { stocks: true, supplier: { select: { name: true } } }, orderBy: { code: "asc" } });
      csvRows = parts.map(p => {
        const stock = p.stocks.reduce((s, st) => s + st.qty, 0);
        const alloc = p.stocks.reduce((s, st) => s + st.allocated, 0);
        const onOrder = p.stocks.reduce((s, st) => s + st.onOrder, 0);
        const eff = stock - alloc + onOrder;
        const status = p.shortageReason ? "メーカー欠品" : stock === 0 ? "在庫切れ" : eff < p.reorderPoint ? "発注点割れ" : "正常";
        return [p.id, p.code, p.name, p.maker || "", stock, alloc, onOrder, eff, p.unitPrice, stock * p.unitPrice, p.defaultLocId || "", status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else if (type === "slow_moving") {
      title = "滞留在庫レポート";
      csvHeader = "品番,品名,在庫数,単価,在庫金額,最終入出庫日,滞留日数";
      const stocks = await prisma.tStock.findMany({ include: { part: { select: { id: true, name: true, unitPrice: true, deletedAt: true } } }, where: { qty: { gt: 0 } } });
      const now = new Date();
      csvRows = stocks.filter(s => !s.part.deletedAt).map(s => {
        const days = s.lastInoutAt ? Math.floor((now.getTime() - s.lastInoutAt.getTime()) / 86400000) : 999;
        return [s.part.id, s.part.name, s.qty, s.part.unitPrice, s.qty * s.part.unitPrice, s.lastInoutAt?.toISOString().slice(0, 10) || "なし", days].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      }).sort((a, b) => Number(b.split(",").pop()?.replace(/"/g, "")) - Number(a.split(",").pop()?.replace(/"/g, "")));
    } else if (type === "abc") {
      title = "ABC分析";
      csvHeader = "品番,品名,在庫金額,累計比率,ランク";
      const parts = await prisma.mPart.findMany({ where: { deletedAt: null }, include: { stocks: true }, orderBy: { code: "asc" } });
      const withValue = parts.map(p => ({ id: p.id, name: p.name, value: p.stocks.reduce((s, st) => s + st.qty, 0) * p.unitPrice })).sort((a, b) => b.value - a.value);
      const total = withValue.reduce((s, p) => s + p.value, 0) || 1;
      let cum = 0;
      csvRows = withValue.map(p => {
        cum += p.value;
        const pct = cum / total * 100;
        const rank = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
        return [p.id, p.name, p.value, pct.toFixed(1) + "%", rank].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else if (type === "turnover") {
      title = "回転率レポート";
      csvHeader = "品番,品名,平均在庫,出庫数(直近90日),回転率";
      const parts = await prisma.mPart.findMany({ where: { deletedAt: null }, include: { stocks: true }, orderBy: { code: "asc" } });
      const since = new Date(Date.now() - 90 * 86400000);
      const issues = await prisma.tIssue.findMany({ where: { issuedAt: { gte: since } } });
      csvRows = parts.map(p => {
        const stock = p.stocks.reduce((s, st) => s + st.qty, 0);
        const issued = issues.filter(i => i.partId === p.id).reduce((s, i) => s + i.qty, 0);
        const turnover = stock > 0 ? (issued / stock).toFixed(2) : "0";
        return [p.id, p.name, stock, issued, turnover].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else if (type === "order_forecast") {
      title = "発注予定額";
      csvHeader = "品番,品名,現在庫,発注点,不足数,推奨発注数,単価,発注予定額";
      const parts = await prisma.mPart.findMany({ where: { deletedAt: null }, include: { stocks: true }, orderBy: { code: "asc" } });
      csvRows = parts.filter(p => {
        const stock = p.stocks.reduce((s, st) => s + st.qty, 0);
        const alloc = p.stocks.reduce((s, st) => s + st.allocated, 0);
        return stock - alloc < p.reorderPoint;
      }).map(p => {
        const stock = p.stocks.reduce((s, st) => s + st.qty, 0);
        const alloc = p.stocks.reduce((s, st) => s + st.allocated, 0);
        const eff = stock - alloc;
        const recommend = Math.max(p.maxStock - eff, p.reorderPoint);
        return [p.id, p.name, stock, p.reorderPoint, p.reorderPoint - eff, recommend, p.unitPrice, recommend * p.unitPrice].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else if (type === "shortage_impact") {
      title = "メーカー欠品影響";
      csvHeader = "品番,品名,メーカー,欠品理由,廃盤,影響製品数";
      const parts = await prisma.mPart.findMany({ where: { shortageReason: { not: null }, deletedAt: null }, include: { boms: { include: { product: { select: { name: true } } } } } });
      csvRows = parts.map(p => [p.id, p.name, p.maker || "", p.shortageReason || "", p.isDiscontinued ? "廃盤" : "", p.boms.length].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    } else if (type === "monthly_purchase") {
      title = "月次仕入集計";
      csvHeader = "月,仕入先,発注件数,合計金額";
      const orders = await prisma.tOrder.findMany({ where: { status: { not: "draft" } }, include: { supplier: { select: { name: true } } }, orderBy: { orderDate: "asc" } });
      const monthlyMap: Record<string, { supplier: string; count: number; amount: number }[]> = {};
      orders.forEach(o => {
        const month = o.orderDate.toISOString().slice(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = [];
        const entry = monthlyMap[month].find(e => e.supplier === o.supplier.name);
        if (entry) { entry.count++; entry.amount += o.totalAmount; } else { monthlyMap[month].push({ supplier: o.supplier.name, count: 1, amount: o.totalAmount }); }
      });
      Object.entries(monthlyMap).forEach(([month, entries]) => {
        entries.forEach(e => { csvRows.push([month, e.supplier, e.count, e.amount].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")); });
      });
    } else if (type === "stocktake_result") {
      title = "棚卸結果報告書";
      csvHeader = "棚卸番号,部署,品番,品名,帳簿数,実数,差異,承認";
      const stocktakes = await prisma.tStocktake.findMany({
        include: { details: { include: { part: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" }, take: 10,
      });
      stocktakes.forEach(st => {
        st.details.forEach(d => {
          csvRows.push([st.stocktakeNo, d.locationId, d.partId, (d as any).part?.name || "", d.bookQty, d.actualQty ?? "", d.diffQty ?? "", d.approved ? "承認済" : "未承認"].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
        });
      });
    } else {
      return Response.json({ error: "Unknown report type" }, { status: 400 });
    }

    const csv = "\uFEFF" + [csvHeader, ...csvRows].join("\n");
    const fileName = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

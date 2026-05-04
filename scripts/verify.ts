import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const parts = await prisma.mPart.findMany({ include: { stocks: true, supplier: { select: { name: true } } }, where: { deletedAt: null } })
  console.log(`\n=== 1. 部品マスタ: ${parts.length}件 ===`)
  for (const p of parts.slice(0, 5)) {
    const stock = p.stocks.reduce((s: number, st: any) => s + st.qty, 0)
    const alloc = p.stocks.reduce((s: number, st: any) => s + st.allocated, 0)
    const onOrd = p.stocks.reduce((s: number, st: any) => s + st.onOrder, 0)
    console.log(`  ${p.id} ${p.name} | 在庫:${stock} 引当:${alloc} 発注残:${onOrd} 発注点:${p.reorderPoint} 仕入先:${p.supplier?.name}`)
  }

  const orders = await prisma.tOrder.findMany({ include: { supplier: true, details: { include: { part: true } } }, orderBy: { orderNo: 'asc' } })
  console.log(`\n=== 2. 発注管理: ${orders.length}件 ===`)
  for (const o of orders) {
    const detailInfo = o.details.map((d: any) => `${d.part.name}(入庫${d.receivedQty}/${d.qty})`).join(', ')
    console.log(`  ${o.orderNo} | ${o.supplier.name} | ステータス:${o.status} | ¥${o.totalAmount} | ${detailInfo || '明細なし'}`)
  }

  const awaiting = orders.filter(o => ['awaiting', 'partial'].includes(o.status))
  console.log(`\n=== 3. 入庫待ち: ${awaiting.length}件 ===`)
  for (const o of awaiting) {
    for (const d of o.details) {
      console.log(`  ${o.orderNo} ${(d as any).part.name}: 残${d.qty - d.receivedQty}/${d.qty}`)
    }
  }

  const stocks = await prisma.tStock.findMany({ include: { part: { select: { name: true, reorderPoint: true, shortageReason: true, unitPrice: true } } } })
  const totalValue = stocks.reduce((s: number, st: any) => s + st.qty * st.part.unitPrice, 0)
  const lowStock = stocks.filter((s: any) => s.qty - s.allocated < s.part.reorderPoint && !s.part.shortageReason)
  const outOfStock = stocks.filter((s: any) => s.qty === 0)
  console.log(`\n=== 4. 在庫状況 ===`)
  console.log(`  在庫レコード: ${stocks.length} | 在庫総額: ¥${totalValue.toLocaleString()} | 発注点割れ: ${lowStock.length} | 在庫切れ: ${outOfStock.length}`)
  for (const s of lowStock) console.log(`  [発注点割れ] ${s.part.name}: 在庫${s.qty} 引当${s.allocated} 有効${s.qty-s.allocated} < 発注点${s.part.reorderPoint}`)

  const products = await prisma.mProduct.findMany({ include: { boms: { include: { part: { select: { name: true } } } } } })
  console.log(`\n=== 5. 製品・BOM ===`)
  for (const p of products) {
    console.log(`  ${p.code} ${p.name} | BOM: ${p.boms.length}部品`)
    for (const b of p.boms.slice(0, 3)) console.log(`    - ${(b as any).part.name} x${Number(b.qty)} (${b.position || ''})`)
    if (p.boms.length > 3) console.log(`    ... 他${p.boms.length - 3}部品`)
  }

  const prodOrders = await prisma.tProdOrder.findMany({ include: { product: true, bomSnapshot: true, issues: true } })
  console.log(`\n=== 6. 製造指図: ${prodOrders.length}件 ===`)
  for (const po of prodOrders) {
    console.log(`  ${po.prodNo} ${po.product.name} x${po.qty} | ステータス:${po.status} | BOMスナップ:${po.bomSnapshot.length}部品 | 出庫:${po.issues.length}件`)
  }

  const logCount = await prisma.tLog.count()
  const logs = await prisma.tLog.findMany({ take: 5, orderBy: { ts: 'desc' } })
  console.log(`\n=== 7. ログ: 総${logCount}件 (最新5件) ===`)
  for (const l of logs) console.log(`  ${l.ts.toISOString().slice(0,19)} | ${l.category} | ${l.action} | ${l.description?.slice(0,60)}`)

  // Issues
  console.log('\n=== 問題点 ===')
  const emptyOrders = orders.filter(o => o.details.length === 0 && o.status !== 'completed')
  if (emptyOrders.length > 0) console.log(`  [要修正] 明細なしの発注: ${emptyOrders.map(o => `${o.orderNo}(${o.status})`).join(', ')}`)

  const receives = await prisma.tReceive.findMany()
  if (receives.length === 0 && awaiting.length > 0) console.log(`  [要追加] 納品待ち${awaiting.length}件あるが入庫実績0件`)

  const issues = await prisma.tIssue.findMany()
  if (issues.length === 0) console.log(`  [要追加] 出庫実績0件`)

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== データ修正 & テストデータ追加 ===')

  // 1. Fix order statuses: ordered -> awaiting (these are orders sent to suppliers waiting for delivery)
  const updatedOrders = await prisma.tOrder.updateMany({
    where: { status: 'ordered' },
    data: { status: 'awaiting' },
  })
  console.log(`発注ステータス ordered→awaiting: ${updatedOrders.count}件修正`)

  // 2. Set PO-2025-004 to 'partial' (partially received) and create a receive record
  const po004 = await prisma.tOrder.findFirst({ where: { orderNo: 'PO-2025-004' }, include: { details: true } })
  if (po004 && po004.details.length > 0) {
    const detail = po004.details[0]
    // Receive 200 of 500
    await prisma.tReceive.create({
      data: {
        receiveNo: 'RCV-2025-001',
        orderId: po004.id,
        orderDetailId: detail.id,
        partId: detail.partId,
        locationId: 'D-01-1-A', // 電線倉庫
        qty: 200,
        result: 'ok',
        receivedById: 2, // 佐藤
      },
    })
    await prisma.tOrderDetail.update({
      where: { id: detail.id },
      data: { receivedQty: 200 },
    })
    await prisma.tOrder.update({
      where: { id: po004.id },
      data: { status: 'partial' },
    })
    // Update stock
    await prisma.tStock.updateMany({
      where: { partId: detail.partId },
      data: { qty: { increment: 200 }, onOrder: { decrement: 200 } },
    })
    console.log('PO-2025-004: 一部入庫(200/500) + ステータスpartial')
  }

  // 3. Set PO-2025-005 to 'delayed' (overdue delivery)
  await prisma.tOrder.updateMany({
    where: { orderNo: 'PO-2025-005' },
    data: { status: 'delayed' },
  })
  console.log('PO-2025-005: ステータスdelayed (納期遅延)')

  // 4. Add shortage part (メーカー欠品)
  await prisma.mPart.updateMany({
    where: { id: 'PT00012353' },
    data: { shortageReason: '生産終了 → 代替品要検討' },
  })
  console.log('PT00012353: メーカー欠品フラグ設定')

  // 5. Create issue records (出庫実績)
  const mo001 = await prisma.tProdOrder.findFirst({ where: { prodNo: 'MO-2025-001' }, include: { bomSnapshot: true } })
  if (mo001) {
    for (const snap of mo001.bomSnapshot.slice(0, 3)) {
      const issueNo = `ISS-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const issueQty = Math.min(Math.ceil(Number(snap.totalQty)), 5)

      // Find stock location
      const stock = await prisma.tStock.findFirst({ where: { partId: snap.partId } })
      if (stock && stock.qty >= issueQty) {
        await prisma.tIssue.create({
          data: {
            issueNo,
            prodOrderId: mo001.id,
            partId: snap.partId,
            locationId: stock.locationId,
            qty: issueQty,
            issueType: 'production',
            issuedById: 3, // 鈴木
          },
        })
        await prisma.tStock.update({
          where: { id: stock.id },
          data: {
            qty: { decrement: issueQty },
            allocated: { decrement: Math.min(stock.allocated, issueQty) },
          },
        })
        await prisma.tProdOrderBomSnapshot.update({
          where: { id: snap.id },
          data: { pickedQty: issueQty },
        })
        console.log(`出庫: ${snap.partId} x${issueQty} (MO-2025-001)`)
      }
    }
  }

  // 6. Add more log entries for traceability
  const newLogs = [
    { category: 'auth', action: 'login', description: 'ユーザー山田 太郎がログイン', userId: 1, userName: '山田 太郎', targetType: 'user', targetId: '1' },
    { category: 'master', action: 'edit', description: 'PT00012345 発注点を5→10に変更', userId: 1, userName: '山田 太郎', targetType: 'part', targetId: 'PT00012345' },
    { category: 'order', action: 'approve', description: 'PO-2025-002 を承認（電磁接触器 20個 / 関東電子商社）', userId: 1, userName: '山田 太郎', targetType: 'order', targetId: 'PO-2025-002' },
    { category: 'receive', action: 'receive', description: 'PO-2025-004 IV電線 200m 入庫確認（検査合格）', userId: 2, userName: '佐藤 次郎', targetType: 'receive', targetId: 'RCV-2025-001' },
    { category: 'issue', action: 'issue', description: 'MO-2025-001 ピッキング完了（3部品出庫）', userId: 3, userName: '鈴木 三郎', targetType: 'production', targetId: 'MO-2025-001' },
    { category: 'stocktake', action: 'adjust', description: '月次棚卸し差異: PT00012350 帳簿87個→実84個 (-3個調整)', userId: 4, userName: '高橋 四郎', targetType: 'stock', targetId: 'PT00012350' },
    { category: 'master', action: 'shortage', description: 'PT00012353 貫通形変流器をメーカー欠品マーク（生産終了）', userId: 1, userName: '山田 太郎', targetType: 'part', targetId: 'PT00012353' },
  ]
  for (const log of newLogs) {
    await prisma.tLog.create({ data: { ...log, ts: new Date(Date.now() - Math.random() * 7 * 86400000) } })
  }
  console.log(`ログ${newLogs.length}件追加`)

  // 7. Add departments
  const dept1 = await prisma.mDepartment.create({ data: { name: '経営管理部', code: 'MGT', sortOrder: 1 } })
  const dept2 = await prisma.mDepartment.create({ data: { name: '製造部', code: 'MFG', sortOrder: 2 } })
  const dept3 = await prisma.mDepartment.create({ data: { name: '購買部', code: 'PRC', sortOrder: 3 } })
  const dept4 = await prisma.mDepartment.create({ data: { name: '品質管理課', code: 'QC', parentId: dept2.id, sortOrder: 1 } })
  const dept5 = await prisma.mDepartment.create({ data: { name: '組立課', code: 'ASM', parentId: dept2.id, sortOrder: 2 } })
  const dept6 = await prisma.mDepartment.create({ data: { name: '資材課', code: 'MTL', parentId: dept3.id, sortOrder: 1 } })
  console.log('部署6件作成 (経営管理部/製造部/購買部 + 子部署)')

  // Assign users to departments
  await prisma.mUser.update({ where: { id: 1 }, data: { departmentId: dept3.id, department: '購買部' } }) // 山田→購買部
  await prisma.mUser.update({ where: { id: 2 }, data: { departmentId: dept6.id, department: '資材課' } }) // 佐藤→資材課
  await prisma.mUser.update({ where: { id: 3 }, data: { departmentId: dept5.id, department: '組立課' } }) // 鈴木→組立課
  await prisma.mUser.update({ where: { id: 4 }, data: { departmentId: dept1.id, department: '経営管理部' } }) // 高橋→経営管理部
  console.log('ユーザー部署割り当て完了')

  // 8. Add entities
  await prisma.mEntity.createMany({
    data: [
      { entityType: 'company', name: '東京電機商会', code: 'SUP001', category: '仕入先', description: '主要遮断器・開閉器仕入先', isVerified: true },
      { entityType: 'company', name: '関東電子商社', code: 'SUP002', category: '仕入先', description: '接触器・継電器仕入先', isVerified: true },
      { entityType: 'company', name: '○○造船', category: '顧客', description: '第3船 主配電盤受注先', isVerified: true },
      { entityType: 'company', name: '△△重工', category: '顧客', description: '制御盤納入先', isVerified: false },
      { entityType: 'person', name: '山田 太郎', category: '社内', description: '購買管理者', isVerified: true },
      { entityType: 'person', name: '佐藤 次郎', category: '社内', description: '倉庫管理者', isVerified: true },
      { entityType: 'person', name: '田中 一郎', category: '仕入先担当', description: '東京電機商会 営業担当', isVerified: false, sourceDoc: '名刺データ' },
      { entityType: 'contract', name: '第3船 主配電盤 製造契約', category: '受注', description: 'MSB-3型 1台 + CDB-2型 2台', metadata: { amount: 12500000, currency: 'JPY', dueDate: '2025-08-31' }, isVerified: true },
      { entityType: 'amount', name: '第3船 契約金額', category: '受注金額', description: '¥12,500,000（税別）', metadata: { amount: 12500000 }, isVerified: true, sourceDoc: '注文書 No.2025-A003' },
    ],
  })
  console.log('エンティティ9件作成')

  // 9. Lower some stock to trigger reorder alerts
  await prisma.tStock.updateMany({ where: { partId: 'PT00012346' }, data: { qty: 3 } }) // 遮断器60A: 在庫3 < 発注点5
  await prisma.tStock.updateMany({ where: { partId: 'PT00012352' }, data: { qty: 0 } }) // 電流計: 在庫切れ
  console.log('在庫アラート用データ: PT00012346を発注点割れ, PT00012352を在庫切れに')

  console.log('\n=== 完了 ===')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // ==================== Users ====================
  const passwordHash = await bcrypt.hash('password123', 10)

  const users = await Promise.all([
    prisma.mUser.create({
      data: {
        loginId: 'yamada',
        email: 'yamada@sanko.co.jp',
        passwordHash,
        name: '山田 太郎',
        role: 'admin',
        department: '購買管理者',
      },
    }),
    prisma.mUser.create({
      data: {
        loginId: 'sato',
        email: 'sato@sanko.co.jp',
        passwordHash,
        name: '佐藤 次郎',
        role: 'manager',
        department: '倉庫管理者',
      },
    }),
    prisma.mUser.create({
      data: {
        loginId: 'suzuki',
        email: 'suzuki@sanko.co.jp',
        passwordHash,
        name: '鈴木 三郎',
        role: 'operator',
        department: '製造現場',
      },
    }),
    prisma.mUser.create({
      data: {
        loginId: 'takahashi',
        email: 'takahashi@sanko.co.jp',
        passwordHash,
        name: '高橋 四郎',
        role: 'viewer',
        department: '経営企画',
      },
    }),
  ])

  const [yamada, sato, suzuki, takahashi] = users
  console.log(`Created ${users.length} users`)

  // ==================== Suppliers ====================
  const suppliers = await Promise.all([
    prisma.mSupplier.create({
      data: { code: 'SUP001', name: '東京電機商会', tel: '03-1234-5678', contactPerson: '田中一郎' },
    }),
    prisma.mSupplier.create({
      data: { code: 'SUP002', name: '関東電子商社', tel: '03-2345-6789', contactPerson: '吉田花子' },
    }),
    prisma.mSupplier.create({
      data: { code: 'SUP003', name: '横浜計器販売', tel: '045-345-6789', contactPerson: '中村太一' },
    }),
    prisma.mSupplier.create({
      data: { code: 'SUP004', name: 'グローバルパーツ', tel: '03-4567-8901', contactPerson: '木村洋介' },
    }),
    prisma.mSupplier.create({
      data: { code: 'SUP005', name: '関西電線商事', tel: '06-5678-9012', contactPerson: '松本直子' },
    }),
  ])
  console.log(`Created ${suppliers.length} suppliers`)

  // ==================== Locations ====================
  const locationData = [
    { id: 'A-03-2-L', warehouse: '主倉庫', shelf: 'A', col: '03', row: '2', side: 'L', name: 'A棚3列2段 左', maxQty: 100, locType: '通常棚' },
    { id: 'A-03-2-R', warehouse: '主倉庫', shelf: 'A', col: '03', row: '2', side: 'R', name: 'A棚3列2段 右', maxQty: 100, locType: '通常棚' },
    { id: 'A-04-1-L', warehouse: '主倉庫', shelf: 'A', col: '04', row: '1', side: 'L', name: 'A棚4列1段 左', maxQty: 80, locType: '通常棚' },
    { id: 'A-04-1-R', warehouse: '主倉庫', shelf: 'A', col: '04', row: '1', side: 'R', name: 'A棚4列1段 右', maxQty: 80, locType: '通常棚' },
    { id: 'B-01-3-L', warehouse: '主倉庫', shelf: 'B', col: '01', row: '3', side: 'L', name: 'B棚1列3段 左', maxQty: 500, locType: '通常棚' },
    { id: 'B-02-1-L', warehouse: '主倉庫', shelf: 'B', col: '02', row: '1', side: 'L', name: 'B棚2列1段 左', maxQty: 200, locType: '通常棚' },
    { id: 'B-02-2-L', warehouse: '主倉庫', shelf: 'B', col: '02', row: '2', side: 'L', name: 'B棚2列2段 左', maxQty: 250, locType: '通常棚' },
    { id: 'B-02-2-R', warehouse: '主倉庫', shelf: 'B', col: '02', row: '2', side: 'R', name: 'B棚2列2段 右', maxQty: 250, locType: '通常棚' },
    { id: 'B-03-1-L', warehouse: '主倉庫', shelf: 'B', col: '03', row: '1', side: 'L', name: 'B棚3列1段 左', maxQty: 30, locType: '計器棚' },
    { id: 'B-03-1-R', warehouse: '主倉庫', shelf: 'B', col: '03', row: '1', side: 'R', name: 'B棚3列1段 右', maxQty: 30, locType: '計器棚' },
    { id: 'B-04-1-L', warehouse: '主倉庫', shelf: 'B', col: '04', row: '1', side: 'L', name: 'B棚4列1段 左', maxQty: 500, locType: '通常棚' },
    { id: 'C-01-1-L', warehouse: '主倉庫', shelf: 'C', col: '01', row: '1', side: 'L', name: 'C棚1列1段 左', maxQty: 100, locType: '通常棚' },
    { id: 'C-03-2-L', warehouse: '主倉庫', shelf: 'C', col: '03', row: '2', side: 'L', name: 'C棚3列2段 左', maxQty: 10000, locType: '小物棚' },
    { id: 'D-01-1-A', warehouse: '電線倉庫', shelf: 'D', col: '01', row: '1', side: 'A', name: 'D棚1列1段', maxQty: 1000, locType: 'リール棚' },
    { id: 'D-02-1-A', warehouse: '電線倉庫', shelf: 'D', col: '02', row: '1', side: 'A', name: 'D棚2列1段', maxQty: 500, locType: '長尺棚' },
    { id: 'D-02-3-A', warehouse: '電線倉庫', shelf: 'D', col: '02', row: '3', side: 'A', name: 'D棚2列3段', maxQty: 500, locType: '長尺棚' },
    { id: 'D-03-1-A', warehouse: '電線倉庫', shelf: 'D', col: '03', row: '1', side: 'A', name: 'D棚3列1段', maxQty: 3000, locType: 'リール棚' },
    { id: 'F-01-1-A', warehouse: '副資材倉庫', shelf: 'F', col: '01', row: '1', side: 'A', name: 'F棚1列1段', maxQty: 25000, locType: '小物棚' },
  ]

  for (const loc of locationData) {
    await prisma.mLocation.create({ data: loc })
  }
  console.log(`Created ${locationData.length} locations`)

  // ==================== Parts & Stock ====================
  interface PartSeed {
    id: string
    code: string
    name: string
    spec: string
    category: string
    maker: string
    makerCode: string
    supplierName: string
    unit: string
    unitPrice: number
    leadTimeDays: number
    reorderPoint: number
    safetyStock: number
    maxStock: number
    defaultLocId: string
    stock: number
    allocated: number
    onOrder: number
  }

  const supplierMap: Record<string, number> = {
    '東京電機商会': suppliers[0].id,
    '関東電子商社': suppliers[1].id,
    '横浜計器販売': suppliers[2].id,
    'グローバルパーツ': suppliers[3].id,
    '関西電線商事': suppliers[4].id,
  }

  const partsData: PartSeed[] = [
    { id: 'PT00012345', code: 'MCCB-100A-3P', name: '配線用遮断器 100A 3極', spec: '定格100A/3P/IC25kA', category: '遮断器', maker: '三菱電機', makerCode: 'NF125-SV', supplierName: '東京電機商会', unit: '個', unitPrice: 15200, leadTimeDays: 14, reorderPoint: 5, safetyStock: 3, maxStock: 30, defaultLocId: 'A-03-2-L', stock: 12, allocated: 2, onOrder: 10 },
    { id: 'PT00012346', code: 'MCCB-60A-3P', name: '配線用遮断器 60A 3極', spec: '定格60A/3P/IC25kA', category: '遮断器', maker: '三菱電機', makerCode: 'NF63-SV', supplierName: '東京電機商会', unit: '個', unitPrice: 8900, leadTimeDays: 14, reorderPoint: 5, safetyStock: 3, maxStock: 30, defaultLocId: 'A-03-2-R', stock: 8, allocated: 3, onOrder: 0 },
    { id: 'PT00012347', code: 'MCCB-30A-3P', name: '配線用遮断器 30A 3極', spec: '定格30A/3P/IC10kA', category: '遮断器', maker: '三菱電機', makerCode: 'NF32-SV', supplierName: '東京電機商会', unit: '個', unitPrice: 4500, leadTimeDays: 10, reorderPoint: 8, safetyStock: 5, maxStock: 50, defaultLocId: 'A-04-1-L', stock: 22, allocated: 5, onOrder: 0 },
    { id: 'PT00012348', code: 'MC-18A-AC200', name: '電磁接触器 18A AC200V', spec: '補助1a1b/AC200Vコイル', category: '電磁接触器', maker: '富士電機', makerCode: 'SC-E02', supplierName: '関東電子商社', unit: '個', unitPrice: 3200, leadTimeDays: 7, reorderPoint: 10, safetyStock: 5, maxStock: 50, defaultLocId: 'A-04-1-R', stock: 15, allocated: 0, onOrder: 20 },
    { id: 'PT00012349', code: 'OLR-12A', name: '過負荷継電器 12A', spec: '調整範囲9-13A', category: '継電器', maker: '富士電機', makerCode: 'TK-E02', supplierName: '関東電子商社', unit: '個', unitPrice: 2800, leadTimeDays: 7, reorderPoint: 10, safetyStock: 5, maxStock: 50, defaultLocId: 'B-01-3-L', stock: 18, allocated: 0, onOrder: 0 },
    { id: 'PT00012350', code: 'PLC-FX5U-32M', name: 'PLC FX5U 32点', spec: 'DC入力16点/トランジスタ出力16点', category: 'PLC', maker: '三菱電機', makerCode: 'FX5U-32MT/ES', supplierName: '東京電機商会', unit: '台', unitPrice: 68000, leadTimeDays: 21, reorderPoint: 2, safetyStock: 1, maxStock: 10, defaultLocId: 'B-02-1-L', stock: 3, allocated: 1, onOrder: 2 },
    { id: 'PT00012351', code: 'INV-2.2KW', name: 'インバータ 2.2kW', spec: '三相200V/2.2kW/V/f制御', category: 'インバータ', maker: '三菱電機', makerCode: 'FR-D720-2.2K', supplierName: '東京電機商会', unit: '台', unitPrice: 42000, leadTimeDays: 14, reorderPoint: 2, safetyStock: 1, maxStock: 8, defaultLocId: 'B-02-2-L', stock: 4, allocated: 1, onOrder: 0 },
    { id: 'PT00012352', code: 'TOUCH-GOT-7', name: 'タッチパネル 7インチ', spec: '800x480/TFT/Ethernet対応', category: 'HMI', maker: '三菱電機', makerCode: 'GT2107-WTBD', supplierName: '東京電機商会', unit: '台', unitPrice: 89000, leadTimeDays: 21, reorderPoint: 1, safetyStock: 1, maxStock: 5, defaultLocId: 'B-02-2-R', stock: 2, allocated: 1, onOrder: 0 },
    { id: 'PT00012353', code: 'PM-MULTI-96', name: 'マルチメータ 96角', spec: 'AC電圧/電流/電力/周波数/力率', category: '計器', maker: '横河計器', makerCode: 'PR300-31000', supplierName: '横浜計器販売', unit: '台', unitPrice: 35000, leadTimeDays: 14, reorderPoint: 2, safetyStock: 1, maxStock: 10, defaultLocId: 'B-03-1-L', stock: 5, allocated: 2, onOrder: 0 },
    { id: 'PT00012354', code: 'CT-200A', name: '変流器 200/5A', spec: '窓型/200:5A/精度1.0級', category: '計器', maker: '横河計器', makerCode: 'CTL-6-S-200', supplierName: '横浜計器販売', unit: '個', unitPrice: 4200, leadTimeDays: 10, reorderPoint: 5, safetyStock: 3, maxStock: 30, defaultLocId: 'B-03-1-R', stock: 10, allocated: 3, onOrder: 0 },
    { id: 'PT00012355', code: 'RELAY-MY4N', name: 'リレー MY4N DC24V', spec: '4極/DC24Vコイル/接点5A', category: 'リレー', maker: 'オムロン', makerCode: 'MY4N DC24', supplierName: 'グローバルパーツ', unit: '個', unitPrice: 980, leadTimeDays: 5, reorderPoint: 20, safetyStock: 10, maxStock: 100, defaultLocId: 'B-04-1-L', stock: 45, allocated: 8, onOrder: 0 },
    { id: 'PT00012356', code: 'TB-20A-10P', name: '端子台 20A 10極', spec: '20A/10極/レール取付', category: '端子台', maker: '東洋技研', makerCode: 'PTR-10P', supplierName: 'グローバルパーツ', unit: '個', unitPrice: 650, leadTimeDays: 5, reorderPoint: 15, safetyStock: 10, maxStock: 100, defaultLocId: 'C-01-1-L', stock: 30, allocated: 0, onOrder: 0 },
    { id: 'PT00012357', code: 'FUSE-HOLDER-3P', name: 'ヒューズホルダ 3極', spec: '32A/3極/10x38mm', category: 'ヒューズ', maker: '日東工業', makerCode: 'FH32-3', supplierName: 'グローバルパーツ', unit: '個', unitPrice: 1200, leadTimeDays: 7, reorderPoint: 8, safetyStock: 5, maxStock: 40, defaultLocId: 'C-03-2-L', stock: 15, allocated: 0, onOrder: 0 },
    { id: 'PT00012358', code: 'WIRE-IV-5.5SQ', name: 'IV電線 5.5sq 黒', spec: '600V/IV/5.5sq/黒', category: '電線', maker: '住電日立', makerCode: 'IV-5.5-BK', supplierName: '関西電線商事', unit: 'm', unitPrice: 120, leadTimeDays: 7, reorderPoint: 200, safetyStock: 100, maxStock: 1000, defaultLocId: 'D-01-1-A', stock: 450, allocated: 50, onOrder: 500 },
    { id: 'PT00012359', code: 'WIRE-IV-2SQ', name: 'IV電線 2sq 各色', spec: '600V/IV/2sq/赤白黒緑', category: '電線', maker: '住電日立', makerCode: 'IV-2-RWBG', supplierName: '関西電線商事', unit: 'm', unitPrice: 45, leadTimeDays: 7, reorderPoint: 500, safetyStock: 200, maxStock: 3000, defaultLocId: 'D-02-1-A', stock: 1200, allocated: 100, onOrder: 0 },
    { id: 'PT00012360', code: 'DUCT-40x60', name: '配線ダクト 40x60 2m', spec: '40x60mm/2m/グレー', category: 'ダクト', maker: '星和電機', makerCode: 'SD-4060-2', supplierName: 'グローバルパーツ', unit: '本', unitPrice: 780, leadTimeDays: 5, reorderPoint: 10, safetyStock: 5, maxStock: 50, defaultLocId: 'D-02-3-A', stock: 20, allocated: 4, onOrder: 0 },
    { id: 'PT00012361', code: 'CVV-3C-2SQ', name: 'CVVケーブル 3C-2sq', spec: '600V/CVV/3Cx2sq', category: '電線', maker: '住電日立', makerCode: 'CVV-3C-2', supplierName: '関西電線商事', unit: 'm', unitPrice: 180, leadTimeDays: 10, reorderPoint: 100, safetyStock: 50, maxStock: 500, defaultLocId: 'D-03-1-A', stock: 280, allocated: 30, onOrder: 200 },
    { id: 'PT00012365', code: 'MARK-TUBE-1.5', name: 'マークチューブ 1.5sq用', spec: '内径2.5mm/白/100m巻', category: '副資材', maker: '品川商工', makerCode: 'MT-1.5W', supplierName: 'グローバルパーツ', unit: '巻', unitPrice: 350, leadTimeDays: 3, reorderPoint: 5, safetyStock: 3, maxStock: 20, defaultLocId: 'F-01-1-A', stock: 8, allocated: 0, onOrder: 0 },
  ]

  for (const p of partsData) {
    const { stock, allocated, onOrder, supplierName, ...partFields } = p
    await prisma.mPart.create({
      data: {
        ...partFields,
        supplierId: supplierMap[supplierName],
      },
    })
    await prisma.tStock.create({
      data: {
        partId: p.id,
        locationId: p.defaultLocId,
        qty: stock,
        allocated,
        onOrder,
      },
    })
  }
  console.log(`Created ${partsData.length} parts with stock records`)

  // ==================== Products ====================
  const products = await Promise.all([
    prisma.mProduct.create({
      data: {
        code: 'MSB-3',
        name: '主配電盤 MSB-3型',
        category: '主配電盤',
        voltage: 'AC600V 3相3線',
        dimensions: '1800×2200×800',
        drawingNo: 'DWG-MSB-3-2024',
      },
    }),
    prisma.mProduct.create({
      data: {
        code: 'CDB-2',
        name: '制御盤 CDB-2型',
        category: '制御盤',
        voltage: 'AC100/200V',
        dimensions: '1200×1600×600',
        drawingNo: 'DWG-CDB-2-2025',
      },
    }),
  ])
  const [msb3, cdb2] = products
  console.log(`Created ${products.length} products`)

  // ==================== BOM entries ====================
  // MSB-3 BOM
  const msb3Bom = [
    { partId: 'PT00012345', qty: 1, position: 'MCCB1', note: '主幹ブレーカー', sortOrder: 1 },
    { partId: 'PT00012346', qty: 6, position: 'MCCB2-7', note: '分岐ブレーカー', sortOrder: 2 },
    { partId: 'PT00012347', qty: 12, position: 'MCCB8-19', note: '小分岐ブレーカー', sortOrder: 3 },
    { partId: 'PT00012353', qty: 1, position: 'PM1', note: '電力計測用', sortOrder: 4 },
    { partId: 'PT00012354', qty: 3, position: 'CT1-3', note: '主幹電流計測用', sortOrder: 5 },
    { partId: 'PT00012356', qty: 4, position: 'TB1-4', note: '外部接続用', sortOrder: 6 },
    { partId: 'PT00012358', qty: 50, position: '内部配線', note: '主回路配線', sortOrder: 7 },
    { partId: 'PT00012359', qty: 100, position: '内部配線', note: '制御回路配線', sortOrder: 8 },
    { partId: 'PT00012360', qty: 8, position: 'ダクト', note: '配線整理用', sortOrder: 9 },
    { partId: 'PT00012365', qty: 3, position: '全体', note: '線番表示用', sortOrder: 10 },
  ]

  // CDB-2 BOM
  const cdb2Bom = [
    { partId: 'PT00012347', qty: 3, position: 'MCCB1-3', note: '主幹+分岐', sortOrder: 1 },
    { partId: 'PT00012348', qty: 4, position: 'MC1-4', note: 'モーター制御用', sortOrder: 2 },
    { partId: 'PT00012349', qty: 4, position: 'OLR1-4', note: 'モーター保護用', sortOrder: 3 },
    { partId: 'PT00012350', qty: 1, position: 'PLC1', note: 'シーケンス制御', sortOrder: 4 },
    { partId: 'PT00012351', qty: 2, position: 'INV1-2', note: 'ポンプ/ファン制御', sortOrder: 5 },
    { partId: 'PT00012352', qty: 1, position: 'HMI1', note: '操作表示用', sortOrder: 6 },
    { partId: 'PT00012355', qty: 8, position: 'RY1-8', note: 'インターロック/警報', sortOrder: 7 },
    { partId: 'PT00012356', qty: 3, position: 'TB1-3', note: '外部接続用', sortOrder: 8 },
    { partId: 'PT00012359', qty: 80, position: '内部配線', note: '制御回路配線', sortOrder: 9 },
    { partId: 'PT00012360', qty: 6, position: 'ダクト', note: '配線整理用', sortOrder: 10 },
    { partId: 'PT00012361', qty: 30, position: '外部配線', note: 'フィールド配線', sortOrder: 11 },
    { partId: 'PT00012365', qty: 2, position: '全体', note: '線番表示用', sortOrder: 12 },
  ]

  for (const bom of msb3Bom) {
    await prisma.mBom.create({ data: { productId: msb3.id, ...bom } })
  }
  for (const bom of cdb2Bom) {
    await prisma.mBom.create({ data: { productId: cdb2.id, ...bom } })
  }
  console.log(`Created ${msb3Bom.length + cdb2Bom.length} BOM entries`)

  // ==================== Orders ====================
  const orders = [
    {
      orderNo: 'PO-2025-001',
      supplierId: suppliers[0].id,
      status: 'delivered',
      orderDate: new Date('2025-04-01'),
      desiredDate: new Date('2025-04-15'),
      approvedById: yamada.id,
      approvedAt: new Date('2025-04-01T10:00:00Z'),
      createdById: yamada.id,
      totalQty: 10,
      totalAmount: 152000,
      details: [
        { lineNo: 1, partId: 'PT00012345', qty: 10, receivedQty: 10, unitPrice: 15200 },
      ],
    },
    {
      orderNo: 'PO-2025-002',
      supplierId: suppliers[1].id,
      status: 'ordered',
      orderDate: new Date('2025-04-10'),
      desiredDate: new Date('2025-04-25'),
      approvedById: yamada.id,
      approvedAt: new Date('2025-04-10T09:00:00Z'),
      createdById: sato.id,
      totalQty: 20,
      totalAmount: 64000,
      details: [
        { lineNo: 1, partId: 'PT00012348', qty: 20, receivedQty: 0, unitPrice: 3200 },
      ],
    },
    {
      orderNo: 'PO-2025-003',
      supplierId: suppliers[0].id,
      status: 'ordered',
      orderDate: new Date('2025-04-15'),
      desiredDate: new Date('2025-05-10'),
      approvedById: yamada.id,
      approvedAt: new Date('2025-04-15T14:00:00Z'),
      createdById: yamada.id,
      totalQty: 2,
      totalAmount: 136000,
      details: [
        { lineNo: 1, partId: 'PT00012350', qty: 2, receivedQty: 0, unitPrice: 68000 },
      ],
    },
    {
      orderNo: 'PO-2025-004',
      supplierId: suppliers[4].id,
      status: 'ordered',
      orderDate: new Date('2025-04-18'),
      desiredDate: new Date('2025-04-28'),
      createdById: sato.id,
      approvedById: yamada.id,
      approvedAt: new Date('2025-04-18T11:00:00Z'),
      totalQty: 500,
      totalAmount: 60000,
      details: [
        { lineNo: 1, partId: 'PT00012358', qty: 500, receivedQty: 0, unitPrice: 120 },
      ],
    },
    {
      orderNo: 'PO-2025-005',
      supplierId: suppliers[4].id,
      status: 'ordered',
      orderDate: new Date('2025-04-20'),
      desiredDate: new Date('2025-05-05'),
      createdById: sato.id,
      approvedById: yamada.id,
      approvedAt: new Date('2025-04-20T10:00:00Z'),
      totalQty: 200,
      totalAmount: 36000,
      details: [
        { lineNo: 1, partId: 'PT00012361', qty: 200, receivedQty: 0, unitPrice: 180 },
      ],
    },
    {
      orderNo: 'PO-2025-006',
      supplierId: suppliers[0].id,
      status: 'draft',
      orderDate: new Date('2025-04-25'),
      desiredDate: new Date('2025-05-15'),
      createdById: yamada.id,
      totalQty: 15,
      totalAmount: 133500,
      details: [
        { lineNo: 1, partId: 'PT00012346', qty: 10, receivedQty: 0, unitPrice: 8900 },
        { lineNo: 2, partId: 'PT00012347', qty: 5, receivedQty: 0, unitPrice: 4500 },
      ],
    },
  ]

  for (const { details, ...orderData } of orders) {
    const order = await prisma.tOrder.create({ data: orderData })
    for (const detail of details) {
      await prisma.tOrderDetail.create({ data: { orderId: order.id, ...detail } })
    }
  }
  console.log(`Created ${orders.length} orders`)

  // ==================== Production Orders ====================
  const prodOrders = [
    {
      prodNo: 'MO-2025-001',
      productId: msb3.id,
      qty: 1,
      status: 'in_progress',
      startDate: new Date('2025-04-10'),
      dueDate: new Date('2025-05-20'),
      customer: '東京ビルメンテナンス株式会社',
      createdById: yamada.id,
      bomSnapshot: [
        { partId: 'PT00012345', requiredQty: 1, totalQty: 1, pickedQty: 1, position: 'MCCB1', unitPriceAtIssue: 15200 },
        { partId: 'PT00012346', requiredQty: 6, totalQty: 6, pickedQty: 3, position: 'MCCB2-7', unitPriceAtIssue: 8900 },
        { partId: 'PT00012347', requiredQty: 12, totalQty: 12, pickedQty: 5, position: 'MCCB8-19', unitPriceAtIssue: 4500 },
        { partId: 'PT00012353', requiredQty: 1, totalQty: 1, pickedQty: 1, position: 'PM1', unitPriceAtIssue: 35000 },
        { partId: 'PT00012354', requiredQty: 3, totalQty: 3, pickedQty: 3, position: 'CT1-3', unitPriceAtIssue: 4200 },
        { partId: 'PT00012358', requiredQty: 50, totalQty: 50, pickedQty: 50, position: '内部配線', unitPriceAtIssue: 120 },
        { partId: 'PT00012359', requiredQty: 100, totalQty: 100, pickedQty: 100, position: '内部配線', unitPriceAtIssue: 45 },
      ],
    },
    {
      prodNo: 'MO-2025-002',
      productId: cdb2.id,
      qty: 2,
      status: 'allocated',
      startDate: new Date('2025-04-20'),
      dueDate: new Date('2025-05-30'),
      customer: '関東製薬工業株式会社',
      createdById: sato.id,
      bomSnapshot: [
        { partId: 'PT00012347', requiredQty: 3, totalQty: 6, pickedQty: 0, position: 'MCCB1-3', unitPriceAtIssue: 4500 },
        { partId: 'PT00012348', requiredQty: 4, totalQty: 8, pickedQty: 0, position: 'MC1-4', unitPriceAtIssue: 3200 },
        { partId: 'PT00012349', requiredQty: 4, totalQty: 8, pickedQty: 0, position: 'OLR1-4', unitPriceAtIssue: 2800 },
        { partId: 'PT00012350', requiredQty: 1, totalQty: 2, pickedQty: 0, position: 'PLC1', unitPriceAtIssue: 68000 },
        { partId: 'PT00012351', requiredQty: 2, totalQty: 4, pickedQty: 0, position: 'INV1-2', unitPriceAtIssue: 42000 },
        { partId: 'PT00012352', requiredQty: 1, totalQty: 2, pickedQty: 0, position: 'HMI1', unitPriceAtIssue: 89000 },
        { partId: 'PT00012355', requiredQty: 8, totalQty: 16, pickedQty: 0, position: 'RY1-8', unitPriceAtIssue: 980 },
      ],
    },
    {
      prodNo: 'MO-2025-003',
      productId: msb3.id,
      qty: 1,
      status: 'allocated',
      startDate: new Date('2025-05-01'),
      dueDate: new Date('2025-06-15'),
      customer: '横浜港湾施設管理組合',
      createdById: yamada.id,
      bomSnapshot: [
        { partId: 'PT00012345', requiredQty: 1, totalQty: 1, pickedQty: 0, position: 'MCCB1', unitPriceAtIssue: 15200 },
        { partId: 'PT00012346', requiredQty: 6, totalQty: 6, pickedQty: 0, position: 'MCCB2-7', unitPriceAtIssue: 8900 },
        { partId: 'PT00012347', requiredQty: 12, totalQty: 12, pickedQty: 0, position: 'MCCB8-19', unitPriceAtIssue: 4500 },
        { partId: 'PT00012353', requiredQty: 1, totalQty: 1, pickedQty: 0, position: 'PM1', unitPriceAtIssue: 35000 },
        { partId: 'PT00012354', requiredQty: 3, totalQty: 3, pickedQty: 0, position: 'CT1-3', unitPriceAtIssue: 4200 },
      ],
    },
  ]

  for (const { bomSnapshot, ...poData } of prodOrders) {
    const po = await prisma.tProdOrder.create({ data: poData })
    for (const snap of bomSnapshot) {
      await prisma.tProdOrderBomSnapshot.create({ data: { prodOrderId: po.id, ...snap } })
    }
  }
  console.log(`Created ${prodOrders.length} production orders`)

  // ==================== Logs ====================
  const logs = [
    {
      ts: new Date('2025-04-25T09:00:00Z'),
      category: 'stock',
      action: 'receive',
      targetType: 'part',
      targetId: 'PT00012345',
      description: '配線用遮断器 100A 3極を10個入庫（PO-2025-001）',
      userId: sato.id,
      userName: '佐藤 次郎',
    },
    {
      ts: new Date('2025-04-25T10:30:00Z'),
      category: 'stock',
      action: 'issue',
      targetType: 'part',
      targetId: 'PT00012345',
      description: '配線用遮断器 100A 3極を1個出庫（MO-2025-001）',
      userId: suzuki.id,
      userName: '鈴木 三郎',
    },
    {
      ts: new Date('2025-04-25T11:00:00Z'),
      category: 'order',
      action: 'create',
      targetType: 'order',
      targetId: 'PO-2025-006',
      description: '発注書 PO-2025-006 を作成',
      userId: yamada.id,
      userName: '山田 太郎',
    },
    {
      ts: new Date('2025-04-24T14:00:00Z'),
      category: 'stock',
      action: 'issue',
      targetType: 'part',
      targetId: 'PT00012358',
      description: 'IV電線 5.5sq 黒を50m出庫（MO-2025-001）',
      userId: suzuki.id,
      userName: '鈴木 三郎',
    },
    {
      ts: new Date('2025-04-24T14:30:00Z'),
      category: 'stock',
      action: 'issue',
      targetType: 'part',
      targetId: 'PT00012359',
      description: 'IV電線 2sq 各色を100m出庫（MO-2025-001）',
      userId: suzuki.id,
      userName: '鈴木 三郎',
    },
    {
      ts: new Date('2025-04-23T09:00:00Z'),
      category: 'production',
      action: 'start',
      targetType: 'prod_order',
      targetId: 'MO-2025-001',
      description: '製造指示 MO-2025-001 の製造を開始',
      userId: sato.id,
      userName: '佐藤 次郎',
    },
    {
      ts: new Date('2025-04-20T16:00:00Z'),
      category: 'order',
      action: 'approve',
      targetType: 'order',
      targetId: 'PO-2025-005',
      description: '発注書 PO-2025-005 を承認',
      userId: yamada.id,
      userName: '山田 太郎',
    },
    {
      ts: new Date('2025-04-18T11:00:00Z'),
      category: 'order',
      action: 'approve',
      targetType: 'order',
      targetId: 'PO-2025-004',
      description: '発注書 PO-2025-004 を承認',
      userId: yamada.id,
      userName: '山田 太郎',
    },
  ]

  for (const log of logs) {
    await prisma.tLog.create({ data: log })
  }
  console.log(`Created ${logs.length} log entries`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

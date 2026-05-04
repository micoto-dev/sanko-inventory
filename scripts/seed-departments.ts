import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== 既存部署を削除 ===')
  // Remove user department assignments first
  await prisma.mUser.updateMany({ data: { departmentId: null } })
  // Delete all departments
  await prisma.mDepartment.deleteMany({})

  console.log('=== 三工電機 部署構成を登録 ===')

  // 部 (Divisions)
  const service = await prisma.mDepartment.create({ data: { name: 'サービス事業部', code: 'SVC', sortOrder: 1 } })
  const soumu = await prisma.mDepartment.create({ data: { name: '総務部', code: 'GA', sortOrder: 2 } })
  const kanri = await prisma.mDepartment.create({ data: { name: '管理部', code: 'ADM', sortOrder: 3 } })
  const seizou = await prisma.mDepartment.create({ data: { name: '製造部', code: 'MFG', sortOrder: 4 } })
  const hinshitsu = await prisma.mDepartment.create({ data: { name: '品質保証部', code: 'QA', sortOrder: 5 } })

  // 課 (Sections)
  // 総務部
  await prisma.mDepartment.create({ data: { name: '総務課', code: 'GA-GEN', parentId: soumu.id, sortOrder: 1 } })
  await prisma.mDepartment.create({ data: { name: '思いやり食堂課', code: 'GA-CAF', parentId: soumu.id, sortOrder: 2 } })

  // 管理部
  await prisma.mDepartment.create({ data: { name: '営業課', code: 'ADM-SLS', parentId: kanri.id, sortOrder: 1 } })
  await prisma.mDepartment.create({ data: { name: '広報課', code: 'ADM-PR', parentId: kanri.id, sortOrder: 2 } })

  // 製造部
  const sekkei = await prisma.mDepartment.create({ data: { name: '設計課', code: 'MFG-DES', parentId: seizou.id, sortOrder: 1 } })
  const kousaku = await prisma.mDepartment.create({ data: { name: '工作課', code: 'MFG-MCH', parentId: seizou.id, sortOrder: 2 } })
  const kumitate = await prisma.mDepartment.create({ data: { name: '組立課', code: 'MFG-ASM', parentId: seizou.id, sortOrder: 3 } })
  const kensa = await prisma.mDepartment.create({ data: { name: '検査課', code: 'MFG-INS', parentId: seizou.id, sortOrder: 4 } })
  const seikan = await prisma.mDepartment.create({ data: { name: '生管調達課', code: 'MFG-PRC', parentId: seizou.id, sortOrder: 5 } })

  // 品質保証部
  await prisma.mDepartment.create({ data: { name: '品質保証課', code: 'QA-QC', parentId: hinshitsu.id, sortOrder: 1 } })

  console.log('部署登録完了: 5部 + 10課')

  // ユーザーを適切な部署に割り当て
  await prisma.mUser.update({ where: { id: 1 }, data: { departmentId: seikan.id, department: '生管調達課' } })  // 山田→生管調達課
  await prisma.mUser.update({ where: { id: 2 }, data: { departmentId: kumitate.id, department: '組立課' } })    // 佐藤→組立課
  await prisma.mUser.update({ where: { id: 3 }, data: { departmentId: kousaku.id, department: '工作課' } })     // 鈴木→工作課
  await prisma.mUser.update({ where: { id: 4 }, data: { departmentId: kensa.id, department: '検査課' } })       // 高橋→検査課
  console.log('ユーザー部署割り当て完了')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

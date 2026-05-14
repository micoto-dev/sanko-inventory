import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customers } = body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return Response.json({ error: "customers array is required" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const c of customers) {
      if (!c.name) { skipped++; continue; }

      // Skip if code already exists
      if (c.code) {
        const existing = await prisma.mCustomer.findUnique({ where: { code: c.code } });
        if (existing) { skipped++; continue; }
      }

      await prisma.mCustomer.create({
        data: {
          name: c.name,
          code: c.code || null,
          postalCode: c.postalCode || null,
          address: c.address || null,
          tel: c.tel || null,
          fax: c.fax || null,
          email: c.email || null,
          contactPerson: c.contactPerson || null,
          industry: c.industry || null,
          notes: c.notes || null,
        },
      });
      created++;
    }

    await prisma.tLog.create({
      data: {
        category: "master",
        action: "import",
        targetType: "MCustomer",
        targetId: "batch",
        userId: 1,
        description: `顧客CSVインポート: ${created}件登録, ${skipped}件スキップ`,
      },
    });

    return Response.json({ created, skipped, total: customers.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import customers" }, { status: 500 });
  }
}

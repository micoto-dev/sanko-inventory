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

      try {
        // Check existing by code or name
        const existing = c.code
          ? await prisma.mCustomer.findUnique({ where: { code: c.code } })
          : await prisma.mCustomer.findFirst({ where: { name: c.name } });

        if (existing) {
          if (!existing.isActive) {
            // Reactivate and update with new data
            await prisma.mCustomer.update({
              where: { id: existing.id },
              data: {
                isActive: true,
                name: c.name || existing.name,
                code: c.code || existing.code,
                postalCode: c.postalCode || existing.postalCode,
                address: c.address || existing.address,
                tel: c.tel || existing.tel,
                fax: c.fax || existing.fax,
                email: c.email || existing.email,
                contactPerson: c.contactPerson || existing.contactPerson,
                industry: c.industry || existing.industry,
                notes: c.notes || existing.notes,
              },
            });
            created++;
          } else {
            skipped++;
          }
          continue;
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
      } catch (err) {
        console.error(`Skipping customer ${c.name}:`, err);
        skipped++;
      }
    }

    await prisma.tLog.create({
      data: {
        category: "master",
        action: "import",
        targetType: "MCustomer",
        targetId: "batch",
        userId: 1,
        description: `客先CSVインポート: ${created}件登録, ${skipped}件スキップ`,
      },
    });

    return Response.json({ created, skipped, total: customers.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import customers" }, { status: 500 });
  }
}

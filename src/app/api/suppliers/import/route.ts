import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { suppliers } = body;
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      return Response.json({ error: "suppliers array is required" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const s of suppliers) {
      if (!s.name) { skipped++; continue; }
      try {
        const existing = s.code
          ? await prisma.mSupplier.findUnique({ where: { code: s.code } })
          : await prisma.mSupplier.findFirst({ where: { name: s.name } });
        if (existing) { skipped++; continue; }

        await prisma.mSupplier.create({
          data: {
            name: s.name,
            code: s.code || `SUP${String(Date.now()).slice(-6)}`,
            postalCode: s.postalCode || null,
            address: s.address || null,
            tel: s.tel || null,
            fax: s.fax || null,
            email: s.email || null,
            contactPerson: s.contactPerson || null,
            paymentTerms: s.paymentTerms || null,
            notes: s.notes || null,
          },
        });
        created++;
      } catch (err) {
        console.error(`Skipping supplier ${s.name}:`, err);
        skipped++;
      }
    }

    await prisma.tLog.create({
      data: { category: "master", action: "import", targetType: "MSupplier", targetId: "batch", userId: 1, description: `仕入先CSVインポート: ${created}件登録, ${skipped}件スキップ` },
    });

    return Response.json({ created, skipped, total: suppliers.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import suppliers" }, { status: 500 });
  }
}

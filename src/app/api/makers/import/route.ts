import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { makers } = body;
    if (!Array.isArray(makers) || makers.length === 0) {
      return Response.json({ error: "makers array is required" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const m of makers) {
      if (!m.name) { skipped++; continue; }
      try {
        const existing = m.code
          ? await prisma.mMaker.findFirst({ where: { code: m.code } })
          : await prisma.mMaker.findFirst({ where: { name: m.name } });
        if (existing) { skipped++; continue; }

        await prisma.mMaker.create({
          data: {
            name: m.name,
            code: m.code || null,
            tel: m.tel || null,
            email: m.email || null,
            website: m.website || null,
            notes: m.notes || null,
          },
        });
        created++;
      } catch (err) {
        console.error(`Skipping maker ${m.name}:`, err);
        skipped++;
      }
    }

    await prisma.tLog.create({
      data: { category: "master", action: "import", targetType: "MMaker", targetId: "batch", userId: 1, description: `メーカーCSVインポート: ${created}件登録, ${skipped}件スキップ` },
    });

    return Response.json({ created, skipped, total: makers.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import makers" }, { status: 500 });
  }
}

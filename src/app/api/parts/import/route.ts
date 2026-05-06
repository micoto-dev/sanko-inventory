import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parts } = body;

    if (!Array.isArray(parts) || parts.length === 0) {
      return Response.json({ error: "parts array is required" }, { status: 400 });
    }

    // Get last part ID to auto-generate IDs
    const lastPart = await prisma.mPart.findFirst({ orderBy: { id: 'desc' } });
    let lastNum = lastPart ? parseInt(lastPart.id.replace('PT', ''), 10) : 12344;

    let skipped = 0;
    const results = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const part of parts) {
        if (!part.code || !part.name) { skipped++; continue; }

        // Check if code already exists
        const existing = await tx.mPart.findFirst({ where: { code: part.code, deletedAt: null } });
        if (existing) { skipped++; continue; }

        lastNum++;
        const id = 'PT' + String(lastNum).padStart(8, '0');

        const newPart = await tx.mPart.create({
          data: {
            id,
            code: part.code,
            name: part.name,
            spec: part.spec || null,
            category: part.category || null,
            maker: part.maker || null,
            makerCode: part.makerCode || null,
            unit: part.unit || '個',
            unitPrice: Number(part.unitPrice) || 0,
            leadTimeDays: Number(part.leadTimeDays) || 14,
            reorderPoint: Number(part.reorderPoint) || 0,
            safetyStock: Number(part.safetyStock) || 0,
            maxStock: Number(part.maxStock) || 0,
          },
        });
        created.push(newPart);
      }

      if (created.length > 0) {
        await tx.tLog.create({
          data: {
            category: "part",
            action: "bulk_import",
            targetType: "MPart",
            description: `CSV一括登録: ${created.length}件登録 / ${skipped}件スキップ`,
            userId: 1,
          },
        });
      }

      return created;
    });

    return Response.json({ imported: results.length, skipped, total: parts.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import parts" }, { status: 500 });
  }
}

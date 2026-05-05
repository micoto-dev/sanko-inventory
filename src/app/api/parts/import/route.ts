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

    const results = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const part of parts) {
        if (!part.code || !part.name) continue;

        // Check if code already exists
        const existing = await tx.mPart.findUnique({ where: { code: part.code } });
        if (existing) continue;

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
            unitPrice: part.unitPrice || 0,
            leadTimeDays: part.leadTimeDays || 14,
            reorderPoint: part.reorderPoint || 0,
            safetyStock: part.safetyStock || 0,
            maxStock: part.maxStock || 0,
          },
        });
        created.push(newPart);
      }

      await tx.tLog.create({
        data: {
          category: "part",
          action: "bulk_import",
          targetType: "MPart",
          description: `Bulk imported ${created.length} parts`,
        },
      });

      return created;
    });

    return Response.json({ imported: results.length, parts: results }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to import parts" }, { status: 500 });
  }
}

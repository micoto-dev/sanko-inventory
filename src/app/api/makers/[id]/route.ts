import { prisma } from "@/server/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    const existing = await prisma.mMaker.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Maker not found" }, { status: 404 });
    }

    const { name, code, tel, email, website, notes, isActive } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (tel !== undefined) data.tel = tel;
    if (email !== undefined) data.email = email;
    if (website !== undefined) data.website = website;
    if (notes !== undefined) data.notes = notes;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const maker = await tx.mMaker.update({ where: { id: numId }, data });

      await tx.tLog.create({
        data: {
          category: "maker",
          action: "update",
          targetType: "MMaker",
          targetId: id,
          userId: 1,
          description: `Updated maker ${maker.name}`,
          beforeData: existing as object,
          afterData: maker as object,
        },
      });

      return maker;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update maker" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    const existing = await prisma.mMaker.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Maker not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mMaker.update({
        where: { id: numId },
        data: { isActive: false },
      });

      await tx.tLog.create({
        data: {
          category: "maker",
          action: "delete",
          targetType: "MMaker",
          targetId: id,
          userId: 1,
          description: `Deactivated maker ${existing.name}`,
        },
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete maker" }, { status: 500 });
  }
}

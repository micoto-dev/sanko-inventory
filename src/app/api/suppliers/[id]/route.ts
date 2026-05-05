import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplier = await prisma.mSupplier.findUnique({
      where: { id: Number(id) },
    });
    if (!supplier) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }
    return Response.json(supplier);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    const existing = await prisma.mSupplier.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }

    const { code, name, tel, fax, email, contactPerson, address, postalCode, paymentTerms, notes, isActive } = body;

    const data: Record<string, unknown> = {};
    if (code !== undefined) data.code = code;
    if (name !== undefined) data.name = name;
    if (tel !== undefined) data.tel = tel;
    if (fax !== undefined) data.fax = fax;
    if (email !== undefined) data.email = email;
    if (contactPerson !== undefined) data.contactPerson = contactPerson;
    if (address !== undefined) data.address = address;
    if (postalCode !== undefined) data.postalCode = postalCode;
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
    if (notes !== undefined) data.notes = notes;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const supplier = await tx.mSupplier.update({ where: { id: numId }, data });

      await tx.tLog.create({
        data: {
          category: "supplier",
          action: "update",
          targetType: "MSupplier",
          targetId: id,
          userId: 1,
          description: `Updated supplier ${supplier.code}`,
          beforeData: existing as object,
          afterData: supplier as object,
        },
      });

      return supplier;
    });

    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    const existing = await prisma.mSupplier.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mSupplier.update({
        where: { id: numId },
        data: { deletedAt: new Date() },
      });

      await tx.tLog.create({
        data: {
          category: "supplier",
          action: "delete",
          targetType: "MSupplier",
          targetId: id,
          userId: 1,
          description: `Deleted supplier ${existing.code} - ${existing.name}`,
        },
      });
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

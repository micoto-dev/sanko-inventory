import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.mSupplier.findMany({
      where,
      orderBy: { code: "asc" },
    });

    const data = suppliers.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      tel: s.tel,
      fax: s.fax,
      email: s.email,
      contactPerson: s.contactPerson,
      address: s.address,
      postalCode: s.postalCode,
      paymentTerms: s.paymentTerms,
      notes: s.notes,
      isActive: s.isActive,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, tel, fax, email, contactPerson, address, postalCode, paymentTerms, notes } = body;

    if (!code || !name) {
      return Response.json({ error: "code and name are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.mSupplier.create({
        data: { code, name, tel, fax, email, contactPerson, address, postalCode, paymentTerms, notes },
      });

      await tx.tLog.create({
        data: {
          category: "supplier",
          action: "create",
          targetType: "MSupplier",
          targetId: String(supplier.id),
          userId: 1,
          description: `Created supplier ${code} - ${name}`,
        },
      });

      return supplier;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}

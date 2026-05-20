import { prisma } from "@/server/db";

export async function GET() {
  try {
    const customers = await prisma.mCustomer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return Response.json({ data: customers });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, postalCode, address, tel, fax, email, contactPerson, industry, notes } = body;
    if (!name) return Response.json({ error: "name is required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.mCustomer.create({ data: { name, code, postalCode, address, tel, fax, email, contactPerson, industry, notes } });
      await tx.tLog.create({ data: { category: "master", action: "create", targetType: "MCustomer", targetId: String(customer.id), userId: 1, description: `客先「${name}」を登録` } });
      return customer;
    });
    return Response.json({ data: result }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

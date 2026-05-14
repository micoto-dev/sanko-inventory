import { prisma } from "@/server/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, postalCode, address, tel, fax, email, contactPerson, industry, notes } = body;

    const customer = await prisma.mCustomer.update({
      where: { id: Number(id) },
      data: { name, code, postalCode, address, tel, fax, email, contactPerson, industry, notes },
    });

    await prisma.tLog.create({
      data: { category: "master", action: "update", targetType: "MCustomer", targetId: id, userId: 1, description: `顧客「${customer.name}」を更新` },
    });

    return Response.json({ data: customer });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = await prisma.mCustomer.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    await prisma.tLog.create({
      data: { category: "master", action: "delete", targetType: "MCustomer", targetId: id, userId: 1, description: `顧客「${customer.name}」を無効化` },
    });

    return Response.json({ data: customer });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}

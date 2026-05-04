import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prodOrder = await prisma.tProdOrder.findUnique({
      where: { id: Number(id) },
      include: {
        product: true,
        createdBy: { select: { id: true, name: true } },
        bomSnapshot: {
          include: {
            part: {
              select: { id: true, code: true, name: true, spec: true, unit: true, unitPrice: true },
            },
          },
        },
        issues: {
          orderBy: { issuedAt: "desc" },
        },
      },
    });
    if (!prodOrder) {
      return Response.json({ error: "Production order not found" }, { status: 404 });
    }
    return Response.json(prodOrder);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch production order" }, { status: 500 });
  }
}

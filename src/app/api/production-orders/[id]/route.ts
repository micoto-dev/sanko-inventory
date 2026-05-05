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
              select: { id: true, code: true, name: true, spec: true, unit: true, unitPrice: true, defaultLocId: true },
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
    // Convert Prisma Decimal fields to plain numbers for JSON serialization
    const serialized = {
      ...prodOrder,
      qty: Number(prodOrder.qty),
      bomSnapshot: prodOrder.bomSnapshot.map((bs: any) => ({
        ...bs,
        qty: Number(bs.qty),
        requiredQty: bs.requiredQty != null ? Number(bs.requiredQty) : undefined,
        totalQty: bs.totalQty != null ? Number(bs.totalQty) : undefined,
        pickedQty: Number(bs.pickedQty),
        unitPriceAtIssue: bs.unitPriceAtIssue != null ? Number(bs.unitPriceAtIssue) : undefined,
        part: bs.part
          ? { ...bs.part, unitPrice: Number(bs.part.unitPrice) }
          : bs.part,
      })),
    };
    return Response.json(serialized);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch production order" }, { status: 500 });
  }
}

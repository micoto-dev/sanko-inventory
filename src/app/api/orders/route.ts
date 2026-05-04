import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.tOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          details: {
            include: { part: { select: { id: true, code: true, name: true, unit: true } } },
          },
        },
      }),
      prisma.tOrder.count({ where }),
    ]);

    return Response.json({
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, desiredDate, deliveryAddr, paymentTerms, notes, createdById, details } = body;

    if (!supplierId || !createdById || !details?.length) {
      return Response.json({ error: "supplierId, createdById, and details are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate orderNo: PO-{year}-{sequential 4-digit}
      const year = new Date().getFullYear();
      const prefix = `PO-${year}-`;
      const lastOrder = await tx.tOrder.findFirst({
        where: { orderNo: { startsWith: prefix } },
        orderBy: { orderNo: "desc" },
      });

      let seq = 1;
      if (lastOrder) {
        const lastSeq = parseInt(lastOrder.orderNo.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      const orderNo = `${prefix}${String(seq).padStart(4, "0")}`;

      let totalQty = 0;
      let totalAmount = 0;
      const detailData = details.map((d: { partId: string; qty: number; unitPrice: number; remarks?: string }, i: number) => {
        totalQty += d.qty;
        totalAmount += d.qty * d.unitPrice;
        return {
          lineNo: i + 1,
          partId: d.partId,
          qty: d.qty,
          unitPrice: d.unitPrice,
          remarks: d.remarks,
        };
      });

      const order = await tx.tOrder.create({
        data: {
          orderNo,
          supplierId,
          desiredDate: desiredDate ? new Date(desiredDate) : undefined,
          deliveryAddr,
          paymentTerms,
          notes,
          totalQty,
          totalAmount,
          createdById,
          details: { create: detailData },
        },
        include: { details: true },
      });

      await tx.tLog.create({
        data: {
          category: "order",
          action: "create",
          targetType: "TOrder",
          targetId: String(order.id),
          description: `Created order ${orderNo}`,
          userId: createdById,
        },
      });

      return order;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create order" }, { status: 500 });
  }
}

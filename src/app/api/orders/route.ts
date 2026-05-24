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

    // Get all users for resolving comment userIds
    const allUsers = await prisma.mUser.findMany({ select: { id: true, name: true } });
    const userMap = new Map(allUsers.map(u => [u.id, u.name]));

    const data = orders.map((o: any) => {
      let meta: { expectedDeliveryDate?: string; comments?: { text: string; ts: string; user?: string; userId?: number }[] } = {};
      try {
        if (o.notes && o.notes.startsWith('{')) meta = JSON.parse(o.notes);
      } catch { /* not JSON */ }
      // Resolve comment user names from userId
      if (meta.comments) {
        meta.comments = meta.comments.map(c => ({
          ...c,
          user: c.userId ? (userMap.get(c.userId) || c.user || '') : (c.user || ''),
        }));
      }
      return {
        id: o.id,
        orderNo: o.orderNo,
        supplier: o.supplier?.name || '',
        supplierId: o.supplierId,
        orderDate: o.orderDate?.toISOString?.()?.slice(0, 10) || '',
        desiredDate: o.desiredDate?.toISOString?.()?.slice(0, 10) || '',
        expectedDeliveryDate: meta.expectedDeliveryDate || '',
        status: o.status,
        totalQty: Number(o.totalQty),
        totalAmount: Number(o.totalAmount),
        notes: o.notes,
        comments: meta.comments || [],
        createdBy: o.createdBy?.name || '',
        approvedBy: o.approvedBy?.name || '',
        details: (o.details || []).map((d: any) => ({
          id: d.id,
          partId: d.partId,
          partName: d.part?.name || '',
          qty: Number(d.qty),
          receivedQty: Number(d.receivedQty),
          unitPrice: Number(d.unitPrice),
          remarks: d.remarks || null,
        })),
      };
    });

    return Response.json({
      data,
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
    const { supplierId, orderDate, desiredDate, deliveryAddr, paymentTerms, notes, createdById, details } = body;

    const userId = createdById || 1; // Default to admin user
    if (!supplierId || !details?.length) {
      return Response.json({ error: "supplierId and details are required" }, { status: 400 });
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
          orderDate: orderDate ? new Date(orderDate) : undefined,
          desiredDate: desiredDate ? new Date(desiredDate) : undefined,
          deliveryAddr,
          paymentTerms,
          notes,
          totalQty,
          totalAmount,
          createdById: userId,
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
          userId: 1,
          description: `Created order ${orderNo}`,
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

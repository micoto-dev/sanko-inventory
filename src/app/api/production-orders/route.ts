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
      prisma.tProdOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          bomSnapshot: {
            include: { part: { select: { id: true, code: true, name: true, unit: true } } },
          },
        },
      }),
      prisma.tProdOrder.count({ where }),
    ]);

    const data = orders.map((o: any) => ({
      id: o.id,
      prodNo: o.prodNo,
      productId: o.productId,
      productCode: o.product?.code || '',
      productName: o.product?.name || '',
      qty: Number(o.qty),
      status: o.status,
      startDate: o.startDate?.toISOString?.()?.slice(0, 10) || '',
      dueDate: o.dueDate?.toISOString?.()?.slice(0, 10) || '',
      customer: o.customer || '',
    }));

    return Response.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch production orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, qty, startDate, dueDate, customer, notes, createdById } = body;

    if (!productId || !qty || !createdById) {
      return Response.json({ error: "productId, qty, and createdById are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate prodNo
      const year = new Date().getFullYear();
      const prefix = `MO-${year}-`;
      const lastProd = await tx.tProdOrder.findFirst({
        where: { prodNo: { startsWith: prefix } },
        orderBy: { prodNo: "desc" },
      });
      let seq = 1;
      if (lastProd) {
        const lastSeq = parseInt(lastProd.prodNo.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      const prodNo = `${prefix}${String(seq).padStart(4, "0")}`;

      // Get BOM for the product
      const boms = await tx.mBom.findMany({
        where: { productId },
        include: { part: { select: { unitPrice: true, defaultLocId: true } } },
      });

      if (!boms.length) {
        throw new Error("No BOM found for this product");
      }

      // Create production order
      const prodOrder = await tx.tProdOrder.create({
        data: {
          prodNo,
          productId,
          qty,
          startDate: startDate ? new Date(startDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          customer,
          notes,
          createdById,
        },
      });

      // Create BOM snapshot and allocate stock
      for (const bom of boms) {
        const totalQty = Number(bom.qty) * qty;

        await tx.tProdOrderBomSnapshot.create({
          data: {
            prodOrderId: prodOrder.id,
            partId: bom.partId,
            requiredQty: bom.qty,
            totalQty,
            pickedQty: 0,
            position: bom.position,
            unitPriceAtIssue: bom.part.unitPrice,
          },
        });

        // Allocate stock at part's default location
        const locId = bom.part.defaultLocId;
        if (locId) {
          await tx.tStock.upsert({
            where: { partId_locationId: { partId: bom.partId, locationId: locId } },
            create: {
              partId: bom.partId,
              locationId: locId,
              qty: 0,
              allocated: Math.ceil(totalQty),
              onOrder: 0,
            },
            update: {
              allocated: { increment: Math.ceil(totalQty) },
            },
          });
        }
      }

      await tx.tLog.create({
        data: {
          category: "production",
          action: "create",
          targetType: "TProdOrder",
          targetId: String(prodOrder.id),
          description: `Created production order ${prodNo} for ${qty} units`,
          userId: createdById,
        },
      });

      return await tx.tProdOrder.findUnique({
        where: { id: prodOrder.id },
        include: { bomSnapshot: true, product: true },
      });
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to create production order";
    return Response.json({ error: message }, { status: 500 });
  }
}

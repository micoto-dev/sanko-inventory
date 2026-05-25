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
          taskChecks: { select: { taskId: true, isChecked: true } },
          orderStages: { include: { stage: true } },
        },
      }),
      prisma.tProdOrder.count({ where }),
    ]);

    const data = orders.map((o: any) => ({
      id: o.id,
      prodNo: o.prodNo,
      productId: o.productId,
      productCode: o.product?.code || '',
      qty: Number(o.qty),
      status: o.status,
      division: o.division || '',
      category: o.category || '',
      productName: o.productName || o.product?.name || '',
      startDate: o.startDate?.toISOString?.()?.slice(0, 10) || '',
      dueDate: o.dueDate?.toISOString?.()?.slice(0, 10) || '',
      customer: o.customer || '',
      amount: o.amount ? Number(o.amount) : null,
      taskChecks: (o.taskChecks || []).map((tc: any) => ({ taskId: tc.taskId, isChecked: tc.isChecked })),
      orderStages: (o.orderStages || []).map((os: any) => ({
        id: os.id,
        stageId: os.stageId,
        stageKey: os.stage?.key,
        stageName: os.stage?.name,
        stageColor: os.stage?.color,
        stageSortOrder: os.stage?.sortOrder,
        startDate: os.startDate ? os.startDate.toISOString().slice(0, 10) : '',
        dueDate: os.dueDate ? os.dueDate.toISOString().slice(0, 10) : '',
        status: os.status,
      })),
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
    const { productId, qty, division, category, productName: prodName, startDate, dueDate, customer, amount, notes, createdById } = body;

    if (!qty || !createdById) {
      return Response.json({ error: "qty and createdById are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate prodNo (工番): 6桁の連番
      const lastProd = await tx.tProdOrder.findFirst({
        orderBy: { prodNo: "desc" },
        where: { prodNo: { not: { startsWith: "MO-" } } },
      });
      // Also check old format
      const lastOld = await tx.tProdOrder.findFirst({
        orderBy: { id: "desc" },
      });
      let seq = 1;
      if (lastProd) {
        const lastSeq = parseInt(lastProd.prodNo, 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      // Ensure we don't go below existing count
      const totalCount = await tx.tProdOrder.count();
      if (seq <= totalCount) seq = totalCount + 1;
      // Ensure at least 6 digits starting from 100001
      if (seq < 100001) seq = 100001;
      const prodNo = String(seq);

      // Create production order
      const prodOrder = await tx.tProdOrder.create({
        data: {
          prodNo,
          productId: productId || null,
          qty,
          division: division || null,
          category: category || null,
          productName: prodName || null,
          startDate: startDate ? new Date(startDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          customer,
          amount: amount ? Number(amount) : null,
          notes,
          createdById,
        },
      });

      // If product selected, create BOM snapshot and allocate stock
      if (productId) {
        const boms = await tx.mBom.findMany({
          where: { productId },
          include: { part: { select: { unitPrice: true, defaultLocId: true } } },
        });

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

          const locId = bom.part.defaultLocId;
          if (locId) {
            await tx.tStock.upsert({
              where: { partId_locationId: { partId: bom.partId, locationId: locId } },
              create: { partId: bom.partId, locationId: locId, qty: 0, allocated: Math.ceil(totalQty), onOrder: 0 },
              update: { allocated: { increment: Math.ceil(totalQty) } },
            });
          }
        }
      }

      await tx.tLog.create({
        data: {
          category: "production",
          action: "create",
          targetType: "TProdOrder",
          targetId: String(prodOrder.id),
          userId: 1,
          description: `受注登録 ${prodNo} ${customer || ''} ${category || ''} x${qty}`,
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

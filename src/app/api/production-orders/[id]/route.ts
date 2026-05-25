import { prisma } from "@/server/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    // Auto-init missing TProdOrderStage rows for active stages
    const stages = await prisma.mProductionStage.findMany({ where: { isActive: true } });
    const existingOrderStages = await prisma.tProdOrderStage.findMany({ where: { prodOrderId: numId } });
    const existingStageIds = new Set(existingOrderStages.map(e => e.stageId));
    const missing = stages.filter(s => !existingStageIds.has(s.id));
    if (missing.length > 0) {
      await prisma.tProdOrderStage.createMany({
        data: missing.map(s => ({ prodOrderId: numId, stageId: s.id })),
        skipDuplicates: true,
      });
    }

    const prodOrder = await prisma.tProdOrder.findUnique({
      where: { id: numId },
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
        taskChecks: { include: { checkedBy: { select: { id: true, name: true } } } },
        orderStages: { include: { stage: true } },
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
      orderStages: ((prodOrder as any).orderStages || []).map((os: any) => ({
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
    };
    return Response.json(serialized);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch production order" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { qty, status, division, category, productName, startDate, dueDate, customer, amount, notes, bomItems } = body;
    const data: Record<string, unknown> = {};
    if (qty !== undefined) data.qty = qty;
    if (status !== undefined) data.status = status;
    if (division !== undefined) data.division = division;
    if (category !== undefined) data.category = category;
    if (productName !== undefined) data.productName = productName;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (customer !== undefined) data.customer = customer;
    if (amount !== undefined) data.amount = amount ? Number(amount) : null;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.tProdOrder.update({ where: { id: Number(id) }, data });

      if (bomItems && Array.isArray(bomItems)) {
        await tx.tProdOrderBomSnapshot.deleteMany({ where: { prodOrderId: Number(id) } });
        for (const item of bomItems) {
          await tx.tProdOrderBomSnapshot.create({ data: {
            prodOrderId: Number(id),
            partId: item.partId,
            requiredQty: item.qty,
            totalQty: item.qty,
            pickedQty: 0,
            position: item.position || '',
            unitPriceAtIssue: 0,
          }});
        }
      }

      await tx.tLog.create({ data: { category: "production", action: "update", targetType: "TProdOrder", targetId: id, userId: 1, description: `受注 ${order.prodNo} を更新` } });
      return order;
    });
    return Response.json(updated);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update production order" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const order = await prisma.tProdOrder.findUnique({ where: { id: numId } });
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Release allocated stock
      const snapshots = await tx.tProdOrderBomSnapshot.findMany({ where: { prodOrderId: numId } });
      for (const snap of snapshots) {
        const allocated = Math.ceil(Number(snap.totalQty)) - Math.ceil(Number(snap.pickedQty));
        if (allocated > 0) {
          const part = await tx.mPart.findUnique({ where: { id: snap.partId }, select: { defaultLocId: true } });
          if (part?.defaultLocId) {
            const stock = await tx.tStock.findUnique({ where: { partId_locationId: { partId: snap.partId, locationId: part.defaultLocId } } });
            if (stock) {
              await tx.tStock.update({ where: { partId_locationId: { partId: snap.partId, locationId: part.defaultLocId } }, data: { allocated: { decrement: Math.min(allocated, stock.allocated) } } });
            }
          }
        }
      }
      await tx.tProdOrderBomSnapshot.deleteMany({ where: { prodOrderId: numId } });
      await tx.tProdOrder.delete({ where: { id: numId } });
      await tx.tLog.create({ data: { category: "production", action: "delete", targetType: "TProdOrder", targetId: id, userId: 1, description: `受注 ${order.prodNo} を削除（引当解除）` } });
    });
    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete production order" }, { status: 500 });
  }
}

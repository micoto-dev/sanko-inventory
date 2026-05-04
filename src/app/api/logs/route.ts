import { prisma } from "@/server/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const userId = searchParams.get("userId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (userId) where.userId = Number(userId);
    if (from || to) {
      const tsFilter: Record<string, Date> = {};
      if (from) tsFilter.gte = new Date(from);
      if (to) tsFilter.lte = new Date(to);
      where.ts = tsFilter;
    }

    const [logs, total] = await Promise.all([
      prisma.tLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ts: "desc" },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.tLog.count({ where }),
    ]);

    const data = logs.map((l: any) => ({
      id: l.id,
      ts: l.ts?.toISOString?.() || '',
      userName: l.user?.name || l.userName || '',
      category: l.category,
      action: l.action,
      targetId: l.targetId,
      description: l.description,
    }));

    return Response.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

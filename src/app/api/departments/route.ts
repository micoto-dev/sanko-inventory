import { prisma } from "@/server/db";

export async function GET() {
  try {
    const departments = await prisma.mDepartment.findMany({
      include: {
        parent: { select: { name: true } },
        _count: { select: { children: true, users: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    const data = departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      parentId: d.parentId,
      parentName: d.parent?.name ?? null,
      sortOrder: d.sortOrder,
      description: d.description,
      isActive: d.isActive,
      childrenCount: d._count.children,
      userCount: d._count.users,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, parentId, sortOrder, description } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const dept = await tx.mDepartment.create({
        data: {
          name,
          code: code || null,
          parentId: parentId || null,
          sortOrder: sortOrder ?? 0,
          description: description || null,
        },
      });

      await tx.tLog.create({
        data: {
          category: "department",
          action: "create",
          targetType: "MDepartment",
          targetId: String(dept.id),
          description: `Created department ${name}`,
          afterData: dept as object,
        },
      });

      return dept;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create department" }, { status: 500 });
  }
}

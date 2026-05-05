import { prisma } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dept = await prisma.mDepartment.findUnique({
      where: { id: Number(id) },
      include: {
        children: { select: { id: true, name: true, code: true, isActive: true } },
        users: { select: { id: true, name: true, loginId: true, role: true, isActive: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    if (!dept) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    return Response.json(dept);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deptId = Number(id);
    const body = await request.json();
    const { name, code, parentId, sortOrder, description, isActive } = body;

    const existing = await prisma.mDepartment.findUnique({ where: { id: deptId } });
    if (!existing) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await prisma.$transaction(async (tx) => {
      const dept = await tx.mDepartment.update({
        where: { id: deptId },
        data: updateData,
      });

      await tx.tLog.create({
        data: {
          category: "department",
          action: "update",
          targetType: "MDepartment",
          targetId: String(deptId),
          userId: 1,
          description: `Updated department ${existing.name}`,
          beforeData: existing as object,
          afterData: dept as object,
        },
      });

      return dept;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deptId = Number(id);

    const existing = await prisma.mDepartment.findUnique({
      where: { id: deptId },
      include: { _count: { select: { children: true } } },
    });

    if (!existing) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    if (existing._count.children > 0) {
      return Response.json(
        { error: "Cannot delete department with children. Remove or reassign child departments first." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const dept = await tx.mDepartment.update({
        where: { id: deptId },
        data: { isActive: false },
      });

      await tx.tLog.create({
        data: {
          category: "department",
          action: "soft_delete",
          targetType: "MDepartment",
          targetId: String(deptId),
          userId: 1,
          description: `Soft-deleted department ${existing.name}`,
          beforeData: { isActive: existing.isActive } as object,
          afterData: { isActive: false } as object,
        },
      });

      return dept;
    });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

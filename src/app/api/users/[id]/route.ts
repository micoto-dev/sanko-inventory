import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.mUser.findUnique({
      where: { id: Number(id) },
      include: { dept: { select: { name: true } } },
    });

    if (!user || user.deletedAt) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.dept?.name ?? null,
      departmentId: user.departmentId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();
    const { role, departmentId, isActive, name, email, department, password } = body;

    const existing = await prisma.mUser.findUnique({ where: { id: userId } });
    if (!existing || existing.deletedAt) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.mUser.update({
        where: { id: userId },
        data: updateData,
      });

      await tx.tLog.create({
        data: {
          category: "user",
          action: "update",
          targetType: "MUser",
          targetId: String(userId),
          description: `Updated user ${existing.loginId}`,
          beforeData: {
            role: existing.role,
            departmentId: existing.departmentId,
            isActive: existing.isActive,
            name: existing.name,
            email: existing.email,
          } as object,
          afterData: {
            role: user.role,
            departmentId: user.departmentId,
            isActive: user.isActive,
            name: user.name,
            email: user.email,
          } as object,
        },
      });

      return user;
    });

    return Response.json({
      id: result.id,
      loginId: result.loginId,
      email: result.email,
      name: result.name,
      role: result.role,
      departmentId: result.departmentId,
      isActive: result.isActive,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

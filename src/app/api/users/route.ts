import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const users = await prisma.mUser.findMany({
      where: { deletedAt: null },
      include: {
        dept: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = users.map((u) => ({
      id: u.id,
      loginId: u.loginId,
      email: u.email,
      name: u.name,
      role: u.role,
      department: u.dept?.name ?? null,
      departmentId: u.departmentId,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return Response.json({ data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loginId, email, name, role, departmentId, password } = body;

    if (!loginId || !email || !name || !password) {
      return Response.json(
        { error: "loginId, email, name, and password are required" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.mUser.create({
        data: {
          loginId,
          email,
          name,
          role: role || "user",
          departmentId: departmentId || null,
          passwordHash,
        },
      });

      await tx.tLog.create({
        data: {
          category: "user",
          action: "create",
          targetType: "MUser",
          targetId: String(user.id),
          description: `Created user ${loginId} - ${name}`,
          afterData: { id: user.id, loginId, email, name, role: user.role } as object,
        },
      });

      return user;
    });

    return Response.json(
      {
        id: result.id,
        loginId: result.loginId,
        email: result.email,
        name: result.name,
        role: result.role,
        departmentId: result.departmentId,
        isActive: result.isActive,
        createdAt: result.createdAt,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

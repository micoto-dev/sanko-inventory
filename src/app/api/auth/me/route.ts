import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const user = await prisma.mUser.findUnique({
      where: { id: userId },
      include: { dept: { select: { name: true } } },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      data: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.dept?.name || null,
        departmentId: user.departmentId,
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to get user info" }, { status: 500 });
  }
}

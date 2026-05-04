import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.mUser.update({
      where: { id: Number(id) },
      data: { passwordHash, failedCount: 0, lockedUntil: null },
    });

    await prisma.tLog.create({
      data: {
        category: "auth",
        action: "password_reset",
        targetType: "user",
        targetId: id,
        description: `User ${id} password was reset by admin`,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to reset password" }, { status: 500 });
  }
}

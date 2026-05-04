import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return Response.json({ error: "email, token, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.mUser.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // Verify token matches the stored hash
    const tokenValid = await bcrypt.compare(token, user.passwordHash);
    if (!tokenValid) {
      return Response.json({ error: "無効または期限切れのリンクです" }, { status: 403 });
    }

    // Set the real password
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.mUser.update({
      where: { id: user.id },
      data: { passwordHash, failedCount: 0, lockedUntil: null },
    });

    await prisma.tLog.create({
      data: {
        category: "auth",
        action: "password_setup",
        targetType: "user",
        targetId: String(user.id),
        description: `ユーザー ${user.name} が初回パスワードを設定`,
        userId: user.id,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "パスワード設定に失敗しました" }, { status: 500 });
  }
}

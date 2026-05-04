import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { randomUUID } from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
    const { email, name, role, departmentId } = body;

    if (!email || !name) {
      return Response.json(
        { error: "email and name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await prisma.mUser.findFirst({ where: { email, deletedAt: null } });
    if (existing) {
      return Response.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    // Generate unique loginId from email, append number if duplicate
    let loginId = email.split("@")[0];
    const existingLogin = await prisma.mUser.findFirst({ where: { loginId } });
    if (existingLogin) {
      const count = await prisma.mUser.count({ where: { loginId: { startsWith: loginId } } });
      loginId = `${loginId}${count + 1}`;
    }
    // Generate invite token (user will set password on first access)
    const inviteToken = randomUUID() + randomUUID();
    // Temporary password hash (won't be used for login until user sets real password)
    const passwordHash = await bcrypt.hash(inviteToken, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.mUser.create({
        data: {
          loginId,
          email,
          name,
          role: role || "user",
          departmentId: departmentId || null,
          passwordHash,
          isActive: true,
        },
      });

      await tx.tLog.create({
        data: {
          category: "user",
          action: "invite",
          targetType: "MUser",
          targetId: String(user.id),
          description: `ユーザー招待: ${name} (${email})`,
          afterData: { id: user.id, email, name, role: user.role } as object,
        },
      });

      return user;
    });

    // Send invitation email with setup link
    const appUrl = process.env.AUTH_URL || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
    const setupUrl = `${appUrl}/setup?token=${inviteToken}&email=${encodeURIComponent(email)}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "三工電機 在庫管理 <onboarding@resend.dev>",
          to: [email],
          subject: "【三工電機】在庫管理システムへの招待",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1e293b;">三工電機 在庫管理システム</h2>
              <p>${name} 様</p>
              <p>在庫管理システムへ招待されました。<br>以下のリンクからパスワードを設定してログインしてください。</p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${setupUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">パスワードを設定してログイン</a>
              </div>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 13px;"><strong>ログインURL:</strong> <a href="${appUrl}/login">${appUrl}/login</a></p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>メールアドレス:</strong> ${email}</p>
              </div>
              <p style="color: #64748b; font-size: 12px;">このリンクの有効期限は7日間です。</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">三工電機株式会社 在庫管理システム</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send invitation email:", emailErr);
      }
    } else {
      console.log(`[EMAIL SKIP] RESEND_API_KEY not set. Invitation for ${email} not sent.`);
    }

    return Response.json(
      {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        emailSent: !!resend,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

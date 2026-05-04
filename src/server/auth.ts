import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/server/db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.mUser.findFirst({
          where: { email: credentials.email as string, deletedAt: null },
        })
        if (!user || !user.isActive) return null

        // Check account lock
        if (user.lockedUntil && user.lockedUntil > new Date()) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) {
          // Increment failed login count
          const newCount = user.failedCount + 1
          await prisma.mUser.update({
            where: { id: user.id },
            data: {
              failedCount: newCount,
              ...(newCount >= 5
                ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
                : {}),
            },
          })
          return null
        }

        // Reset failed count and update last login time
        await prisma.mUser.update({
          where: { id: user.id },
          data: { failedCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        })

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.userId = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
        ;(session.user as any).id = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
})

// lib/auth.ts
import NextAuth from "next-auth"
import Kakao from "next-auth/providers/kakao"
import { prisma } from "@/lib/prisma"
import { generateUniqueUsername } from "@/lib/generate-username"

interface KakaoProfile {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "kakao" || !profile) return false
      const kp = profile as unknown as KakaoProfile

      await prisma.user.upsert({
        where: { kakaoId: String(kp.id) },
        update: {
          name: kp.kakao_account?.profile?.nickname ?? "사용자",
          avatarUrl: kp.kakao_account?.profile?.profile_image_url ?? null,
        },
        create: {
          kakaoId: String(kp.id),
          name: kp.kakao_account?.profile?.nickname ?? "사용자",
          username: await generateUniqueUsername(kp),
          avatarUrl: kp.kakao_account?.profile?.profile_image_url ?? null,
        },
      })
      return true
    },

    async jwt({ token, account, profile }) {
      if (account?.provider === "kakao" && profile) {
        const kp = profile as unknown as KakaoProfile
        const user = await prisma.user.findUnique({
          where: { kakaoId: String(kp.id) },
          select: { id: true, username: true },
        })
        if (user) {
          token.userId = user.id
          token.username = user.username
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.username = token.username as string
      return session
    },
  },
})

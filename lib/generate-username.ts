import { prisma } from "@/lib/prisma"

interface KakaoProfileLike {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
    }
  }
}

export async function generateUniqueUsername(
  profile: KakaoProfileLike
): Promise<string> {
  const base =
    (profile.kakao_account?.profile?.nickname ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15) || "user"

  let username = base
  let count = 0

  while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    count++
    username = `${base}${count}`
  }

  return username
}

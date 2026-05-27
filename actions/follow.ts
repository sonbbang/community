// actions/follow.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function toggleFollow(targetUserId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const followerId = session.user.id
  const followingId = targetUserId

  if (followerId === followingId) throw new Error("Cannot follow yourself")

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })

  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    })
  } else {
    await prisma.follow.create({ data: { followerId, followingId } })
  }

  revalidatePath("/")
  revalidatePath(`/${targetUserId}`)
}

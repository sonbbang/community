// actions/reaction.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function toggleLike(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } })
  } else {
    await prisma.like.create({ data: { userId, postId } })
  }

  revalidatePath("/")
}

export async function toggleRepost(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id
  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.repost.delete({ where: { userId_postId: { userId, postId } } })
  } else {
    await prisma.repost.create({ data: { userId, postId } })
  }

  revalidatePath("/")
}

// actions/post.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const content = (formData.get("content") as string | null)?.trim() || null
  const rawImageUrls = formData.getAll("imageUrls") as string[]
  const imageUrls = rawImageUrls.filter((url) => {
    try { new URL(url); return true } catch { return false }
  })

  if (!content && imageUrls.length === 0) {
    throw new Error("Post must have content or at least one image")
  }

  const post = await prisma.post.create({
    data: { content, imageUrls, authorId: session.user.id },
  })

  revalidatePath("/")
  return post
}

export async function deletePost(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })

  if (!post || post.authorId !== session.user.id) throw new Error("Forbidden")

  await prisma.post.delete({ where: { id: postId } })
  revalidatePath("/")
  revalidatePath(`/post/${postId}`)
}

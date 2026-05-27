// app/(main)/post/[id]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PostCard } from "@/components/post/PostCard"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const currentUserId = session!.user.id

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
      _count: { select: { likes: true, reposts: true } },
      likes: { where: { userId: currentUserId }, select: { id: true } },
      reposts: { where: { userId: currentUserId }, select: { id: true } },
    },
  })

  if (!post) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 py-3 border-b text-sm font-semibold">게시글</div>
      <PostCard post={post} currentUserId={currentUserId} />
      <div className="px-4 py-4 text-sm text-muted-foreground border-t">
        좋아요 {post._count.likes}개 · 리포스트 {post._count.reposts}개
      </div>
    </div>
  )
}

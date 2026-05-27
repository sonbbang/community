// app/(main)/page.tsx
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FeedTabs } from "@/components/feed/FeedTabs"
import { PostList } from "@/components/post/PostList"

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const { tab } = await searchParams
  const session = await auth()
  const userId = session!.user.id

  const posts = await prisma.post.findMany({
    where:
      tab === "following"
        ? { author: { followers: { some: { followerId: userId } } } }
        : undefined,
    include: {
      author: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
      _count: { select: { likes: true, reposts: true } },
      likes: { where: { userId }, select: { id: true } },
      reposts: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return (
    <div className="max-w-lg mx-auto">
      <Suspense>
        <FeedTabs />
      </Suspense>
      <PostList posts={posts} currentUserId={userId} />
    </div>
  )
}

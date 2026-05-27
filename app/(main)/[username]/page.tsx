// app/(main)/[username]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileHeader } from "@/components/user/ProfileHeader"
import { PostList } from "@/components/post/PostList"

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const session = await auth()
  const currentUserId = session!.user.id

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  })

  if (!user) notFound()

  const [isFollowingRecord, posts] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: user.id,
        },
      },
    }),
    prisma.post.findMany({
      where: { authorId: user.id },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: { select: { likes: true, reposts: true } },
        likes: { where: { userId: currentUserId }, select: { id: true } },
        reposts: { where: { userId: currentUserId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <div className="max-w-lg mx-auto">
      <ProfileHeader
        user={user}
        isFollowing={isFollowingRecord !== null}
        isOwnProfile={user.id === currentUserId}
      />
      <PostList posts={posts} currentUserId={currentUserId} />
    </div>
  )
}

// components/post/PostCard.tsx
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { UserAvatar } from "@/components/user/UserAvatar"
import { PostContent } from "./PostContent"
import { PostActions } from "./PostActions"
import type { PostWithMeta } from "@/lib/types"

interface Props {
  post: PostWithMeta
  currentUserId: string
}

export function PostCard({ post, currentUserId }: Props) {
  const isLiked = post.likes.length > 0
  const isReposted = post.reposts.length > 0

  return (
    <article className="border-b px-4 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <Link href={`/${post.author.username}`} className="flex-shrink-0">
          <UserAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/${post.author.username}`}
              className="font-semibold text-sm hover:underline"
            >
              {post.author.name}
            </Link>
            <span className="text-muted-foreground text-xs">
              @{post.author.username}
            </span>
            <span className="text-muted-foreground text-xs ml-auto">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          <Link href={`/post/${post.id}`}>
            <PostContent content={post.content} imageUrls={post.imageUrls} />
          </Link>
          <PostActions
            postId={post.id}
            likeCount={post._count.likes}
            repostCount={post._count.reposts}
            isLiked={isLiked}
            isReposted={isReposted}
          />
        </div>
      </div>
    </article>
  )
}

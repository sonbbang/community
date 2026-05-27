// components/post/PostActions.tsx
import { LikeButton } from "./LikeButton"
import { RepostButton } from "./RepostButton"
import { ShareButton } from "./ShareButton"

interface Props {
  postId: string
  likeCount: number
  repostCount: number
  isLiked: boolean
  isReposted: boolean
}

export function PostActions({ postId, likeCount, repostCount, isLiked, isReposted }: Props) {
  return (
    <div className="flex items-center gap-4 mt-3">
      <LikeButton postId={postId} initialLiked={isLiked} initialCount={likeCount} />
      <RepostButton postId={postId} initialReposted={isReposted} initialCount={repostCount} />
      <ShareButton postId={postId} />
    </div>
  )
}

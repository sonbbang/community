// components/post/PostList.tsx
import { PostCard } from "./PostCard"
import type { PostWithMeta } from "@/lib/types"

interface Props {
  posts: PostWithMeta[]
  currentUserId: string
}

export function PostList({ posts, currentUserId }: Props) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">아직 게시글이 없어요</p>
        <p className="text-sm mt-1">첫 번째 글을 올려보세요!</p>
      </div>
    )
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

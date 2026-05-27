// components/post/LikeButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleLike } from "@/actions/reaction"

interface Props {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({ postId, initialLiked, initialCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, addOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: newLiked ? state.count + 1 : state.count - 1,
    })
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!optimistic.liked)
      await toggleLike(postId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-sm transition-colors",
        optimistic.liked
          ? "text-red-500"
          : "text-muted-foreground hover:text-red-500"
      )}
    >
      <Heart className={cn("h-5 w-5", optimistic.liked && "fill-current")} />
      <span>{optimistic.count}</span>
    </button>
  )
}

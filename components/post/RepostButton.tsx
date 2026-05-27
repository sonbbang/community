// components/post/RepostButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Repeat2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleRepost } from "@/actions/reaction"

interface Props {
  postId: string
  initialReposted: boolean
  initialCount: number
}

export function RepostButton({ postId, initialReposted, initialCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, addOptimistic] = useOptimistic(
    { reposted: initialReposted, count: initialCount },
    (state, newReposted: boolean) => ({
      reposted: newReposted,
      count: newReposted ? state.count + 1 : state.count - 1,
    })
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!optimistic.reposted)
      await toggleRepost(postId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-sm transition-colors",
        optimistic.reposted
          ? "text-green-500"
          : "text-muted-foreground hover:text-green-500"
      )}
    >
      <Repeat2 className="h-5 w-5" />
      <span>{optimistic.count}</span>
    </button>
  )
}

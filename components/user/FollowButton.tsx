// components/user/FollowButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toggleFollow } from "@/actions/follow"

interface Props {
  targetUserId: string
  initialFollowing: boolean
}

export function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isFollowing, addOptimistic] = useOptimistic(
    initialFollowing,
    (_, next: boolean) => next
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!isFollowing)
      await toggleFollow(targetUserId)
    })
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </Button>
  )
}

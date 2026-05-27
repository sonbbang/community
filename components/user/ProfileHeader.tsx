// components/user/ProfileHeader.tsx
import { UserAvatar } from "./UserAvatar"
import { FollowButton } from "./FollowButton"
import type { UserWithCounts } from "@/lib/types"

interface Props {
  user: UserWithCounts
  isFollowing: boolean
  isOwnProfile: boolean
}

export function ProfileHeader({ user, isFollowing, isOwnProfile }: Props) {
  return (
    <div className="px-4 py-6 border-b">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{user.name}</h1>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
          <div className="flex gap-4 mt-3 text-sm">
            <span>
              <strong>{user._count.followers}</strong>
              <span className="text-muted-foreground ml-1">팔로워</span>
            </span>
            <span>
              <strong>{user._count.following}</strong>
              <span className="text-muted-foreground ml-1">팔로잉</span>
            </span>
          </div>
        </div>
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
      </div>
      {!isOwnProfile && (
        <div className="mt-4">
          <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
        </div>
      )}
    </div>
  )
}

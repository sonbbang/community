// components/user/UserAvatar.tsx
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Props {
  name: string
  avatarUrl: string | null
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: { container: "h-8 w-8",  text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-16 w-16", text: "text-xl" },
}

export function UserAvatar({ name, avatarUrl, size = "md" }: Props) {
  const { container, text } = sizes[size]
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0",
        container
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill className="object-cover" sizes="64px" />
      ) : (
        <span className={cn("font-semibold text-muted-foreground select-none", text)}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Home, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { NewPostButton } from "./NewPostButton"

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex items-center justify-around h-16 z-50">
      <Link
        href="/"
        className={cn(
          "flex flex-col items-center p-2",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="h-6 w-6" />
      </Link>
      <NewPostButton mobile />
      {session?.user?.username && (
        <Link
          href={`/${session.user.username}`}
          className={cn(
            "flex flex-col items-center p-2",
            pathname === `/${session.user.username}`
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <User className="h-6 w-6" />
        </Link>
      )}
    </nav>
  )
}

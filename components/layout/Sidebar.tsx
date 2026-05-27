// components/layout/Sidebar.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { Home, User } from "lucide-react"
import { NewPostButton } from "./NewPostButton"

export async function Sidebar() {
  const session = await auth()

  return (
    <nav className="hidden md:flex flex-col w-64 border-r h-screen sticky top-0 p-4 gap-1">
      <Link href="/" className="text-2xl font-bold mb-6 px-3">
        Community
      </Link>
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Home className="h-5 w-5" />
        <span>홈</span>
      </Link>
      {session?.user?.username && (
        <Link
          href={`/${session.user.username}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <User className="h-5 w-5" />
          <span>프로필</span>
        </Link>
      )}
      <div className="mt-auto">
        <NewPostButton />
      </div>
    </nav>
  )
}

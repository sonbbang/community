// components/feed/FeedTabs.tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function FeedTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") ?? "all"

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => router.push(`/?tab=${v}`, { scroll: false })}
      className="w-full"
    >
      <TabsList className="w-full rounded-none border-b h-12 bg-transparent">
        <TabsTrigger value="all" className="flex-1 rounded-none">
          전체
        </TabsTrigger>
        <TabsTrigger value="following" className="flex-1 rounded-none">
          팔로잉
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

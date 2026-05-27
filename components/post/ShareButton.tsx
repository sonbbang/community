// components/post/ShareButton.tsx
"use client"
import { useState } from "react"
import { Share2, Check } from "lucide-react"

interface Props {
  postId: string
}

export function ShareButton({ postId }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/post/${postId}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <Share2 className="h-5 w-5" />
      )}
    </button>
  )
}

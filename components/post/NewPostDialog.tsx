// components/post/NewPostDialog.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createPost } from "@/actions/post"
import { ImageUploader } from "./ImageUploader"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewPostDialog({ open, onOpenChange }: Props) {
  const [content, setContent] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!content.trim() && imageUrls.length === 0) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("content", content)
      imageUrls.forEach((url) => fd.append("imageUrls", url))
      await createPost(fd)
      setContent("")
      setImageUrls([])
      onOpenChange(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>새 글 작성</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="무슨 생각을 하고 있나요?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <ImageUploader imageUrls={imageUrls} onChange={setImageUrls} maxImages={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!content.trim() && imageUrls.length === 0)}
            >
              {submitting ? "올리는 중..." : "올리기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

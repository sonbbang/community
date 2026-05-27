"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"

// NewPostDialog will be implemented in Task 10
// Using a placeholder open state for now
export function NewPostButton({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {mobile ? (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Pencil className="h-6 w-6" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} className="w-full">
          <Pencil className="mr-2 h-4 w-4" />
          새 글 작성
        </Button>
      )}
    </>
  )
}

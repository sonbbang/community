// components/post/ImageUploader.tsx
"use client"
import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ImageIcon, X } from "lucide-react"

interface Props {
  imageUrls: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageUploader({ imageUrls, onChange, maxImages = 4 }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    const remaining = maxImages - imageUrls.length
    if (remaining <= 0) return

    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      const urls = await Promise.all(
        toUpload.map(async (file) => {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/upload", { method: "POST", body: fd })
          if (!res.ok) throw new Error(await res.text())
          const json = await res.json()
          return json.url as string
        })
      )
      onChange([...imageUrls, ...urls])
    } catch (err) {
      console.error("Upload failed:", err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function remove(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {imageUrls.length > 0 && (
        <div className={`grid gap-1 ${imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {imageUrls.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={url} alt="" fill className="object-cover" sizes="200px" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {imageUrls.length < maxImages && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {uploading ? "업로드 중..." : "사진 추가"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </>
      )}
    </div>
  )
}

// components/post/PostContent.tsx
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Props {
  content: string | null
  imageUrls: string[]
}

export function PostContent({ content, imageUrls }: Props) {
  const gridClass = imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"

  return (
    <div className="mt-1">
      {content && (
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      )}
      {imageUrls.length > 0 && (
        <div className={`mt-2 grid gap-1 ${gridClass}`}>
          {imageUrls.map((url, i) => (
            <div
              key={i}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg",
                imageUrls.length === 3 && i === 0 ? "row-span-2" : ""
              )}
            >
              <Image
                src={url}
                alt={`이미지 ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const fileEntry = formData.get("file")
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const file = fileEntry
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max file size is 5MB" }, { status: 400 })
  }

  const ext = MIME_TO_EXT[file.type] ?? "jpg"
  const path = `${session.user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("posts")
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = supabase.storage.from("posts").getPublicUrl(path)
  if (!data.publicUrl) {
    return NextResponse.json({ error: "Failed to generate public URL" }, { status: 500 })
  }

  return NextResponse.json({ url: data.publicUrl })
}

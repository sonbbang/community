// __tests__/actions/post.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1", username: "tester" } }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createPost, deletePost } from "@/actions/post"
import { prisma } from "@/lib/prisma"

describe("createPost", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates post with content", async () => {
    vi.mocked(prisma.post.create).mockResolvedValue({ id: "p1" } as any)
    const fd = new FormData()
    fd.set("content", "hello world")
    await createPost(fd)
    expect(prisma.post.create).toHaveBeenCalledWith({
      data: { content: "hello world", imageUrls: [], authorId: "user-1" },
    })
  })

  it("throws when content and images are both empty", async () => {
    const fd = new FormData()
    await expect(createPost(fd)).rejects.toThrow("Post must have content or at least one image")
  })

  it("throws Unauthorized when no session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null as any)
    const fd = new FormData()
    fd.set("content", "hi")
    await expect(createPost(fd)).rejects.toThrow("Unauthorized")
  })
})

describe("deletePost", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes post when user is owner", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ authorId: "user-1" } as any)
    vi.mocked(prisma.post.delete).mockResolvedValue({} as any)
    await deletePost("post-1")
    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: "post-1" } })
  })

  it("throws Forbidden when user is not owner", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ authorId: "other-user" } as any)
    await expect(deletePost("post-1")).rejects.toThrow("Forbidden")
  })

  it("throws Forbidden when post not found", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValue(null)
    await expect(deletePost("post-1")).rejects.toThrow("Forbidden")
  })
})

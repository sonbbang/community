// __tests__/actions/reaction.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1", username: "tester" } }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    like: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    repost: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { toggleLike, toggleRepost } from "@/actions/reaction"
import { prisma } from "@/lib/prisma"

describe("toggleLike", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates like when not yet liked", async () => {
    vi.mocked(prisma.like.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.like.create).mockResolvedValue({} as any)

    await toggleLike("post-1")

    expect(prisma.like.create).toHaveBeenCalledWith({
      data: { userId: "user-1", postId: "post-1" },
    })
  })

  it("deletes like when already liked", async () => {
    vi.mocked(prisma.like.findUnique).mockResolvedValue({ id: "like-1" } as any)
    vi.mocked(prisma.like.delete).mockResolvedValue({} as any)

    await toggleLike("post-1")

    expect(prisma.like.delete).toHaveBeenCalledWith({
      where: { userId_postId: { userId: "user-1", postId: "post-1" } },
    })
  })

  it("throws Unauthorized when no session", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)
    await expect(toggleLike("post-1")).rejects.toThrow("Unauthorized")
  })
})

describe("toggleRepost", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates repost when not yet reposted", async () => {
    vi.mocked(prisma.repost.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.repost.create).mockResolvedValue({} as any)

    await toggleRepost("post-1")

    expect(prisma.repost.create).toHaveBeenCalledWith({
      data: { userId: "user-1", postId: "post-1" },
    })
  })

  it("deletes repost when already reposted", async () => {
    vi.mocked(prisma.repost.findUnique).mockResolvedValue({ id: "r-1" } as any)
    vi.mocked(prisma.repost.delete).mockResolvedValue({} as any)

    await toggleRepost("post-1")

    expect(prisma.repost.delete).toHaveBeenCalledWith({
      where: { userId_postId: { userId: "user-1", postId: "post-1" } },
    })
  })
})

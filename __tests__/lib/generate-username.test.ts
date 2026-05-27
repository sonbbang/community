import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { generateUniqueUsername } from "@/lib/generate-username"
import { prisma } from "@/lib/prisma"

describe("generateUniqueUsername", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lowercases and strips non-alphanumeric chars from nickname", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const profile = { id: 1, kakao_account: { profile: { nickname: "Hello World!" } } }
    const result = await generateUniqueUsername(profile as any)
    expect(result).toBe("helloworld")
  })

  it("appends incrementing number when username is taken", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "taken" } as any)
      .mockResolvedValue(null)
    const profile = { id: 1, kakao_account: { profile: { nickname: "testuser" } } }
    const result = await generateUniqueUsername(profile as any)
    expect(result).toBe("testuser1")
  })

  it("falls back to 'user' when nickname is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const result = await generateUniqueUsername({ id: 1 } as any)
    expect(result).toBe("user")
  })
})

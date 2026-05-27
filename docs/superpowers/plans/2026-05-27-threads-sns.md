# Threads-like SNS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Threads-like SNS with Kakao social login, feed, follow/following, likes, reposts, and image uploads on Next.js 15 + Vercel.

**Architecture:** Next.js 15 App Router with Server Components for SSR, Server Actions for mutations, JWT sessions via Auth.js v5 KakaoProvider. Supabase provides PostgreSQL (accessed via Prisma ORM) and file storage. No Supabase Auth — session management is handled entirely by Auth.js.

**Tech Stack:** Next.js 15, TypeScript, Auth.js v5 (`next-auth@beta`), Prisma, Supabase (PostgreSQL + Storage), Tailwind CSS, shadcn/ui, date-fns, lucide-react, Vitest

---

## File Map

```
community/
├── prisma/schema.prisma
├── lib/
│   ├── auth.ts                    # Auth.js config + KakaoProvider
│   ├── prisma.ts                  # Prisma singleton
│   ├── supabase.ts                # Supabase Storage client (server-only)
│   ├── generate-username.ts       # Kakao nickname → unique DB username
│   ├── types.ts                   # Shared Prisma payload types
│   └── utils.ts                   # shadcn cn() helper (auto-generated)
├── types/next-auth.d.ts           # Session type augmentation
├── actions/
│   ├── post.ts                    # createPost, deletePost
│   ├── reaction.ts                # toggleLike, toggleRepost
│   └── follow.ts                  # toggleFollow
├── components/
│   ├── Providers.tsx              # SessionProvider wrapper (Client)
│   ├── layout/
│   │   ├── Sidebar.tsx            # PC left nav (Server)
│   │   ├── BottomNav.tsx          # Mobile bottom bar (Client)
│   │   └── NewPostButton.tsx      # FAB that opens dialog (Client)
│   ├── post/
│   │   ├── PostCard.tsx           # Full post card (Server)
│   │   ├── PostContent.tsx        # Text + image grid (Server)
│   │   ├── PostActions.tsx        # Action bar wrapper (Server)
│   │   ├── LikeButton.tsx         # Optimistic like (Client)
│   │   ├── RepostButton.tsx       # Optimistic repost (Client)
│   │   ├── ShareButton.tsx        # Clipboard copy (Client)
│   │   ├── PostList.tsx           # List renderer (Server)
│   │   ├── NewPostDialog.tsx      # Write post modal (Client)
│   │   └── ImageUploader.tsx      # Multi-image upload (Client)
│   ├── feed/
│   │   └── FeedTabs.tsx           # 전체|팔로잉 tabs (Client)
│   └── user/
│       ├── UserAvatar.tsx         # Avatar with fallback (Server)
│       ├── FollowButton.tsx       # Optimistic follow (Client)
│       └── ProfileHeader.tsx      # Profile header (Server)
├── app/
│   ├── layout.tsx                 # Root layout + Providers
│   ├── globals.css
│   ├── (auth)/login/page.tsx      # Kakao login page
│   ├── (main)/
│   │   ├── layout.tsx             # Sidebar + BottomNav shell
│   │   ├── page.tsx               # Home feed
│   │   ├── [username]/page.tsx    # User profile
│   │   └── post/[id]/page.tsx     # Post detail
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── upload/route.ts        # Supabase Storage upload
├── __tests__/
│   ├── lib/generate-username.test.ts
│   └── actions/reaction.test.ts
├── middleware.ts
├── next.config.ts
├── vitest.config.ts
└── .env.example
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `community/` (entire Next.js project)
- Create: `vitest.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest community \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*"
cd community
```

- [ ] **Step 2: Install dependencies**

```bash
npm install next-auth@beta @prisma/client @supabase/supabase-js date-fns
npm install -D prisma vitest @vitejs/plugin-react
```

- [ ] **Step 3: Init shadcn**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button dialog textarea tabs separator
```

Expected: `components/ui/` created, `lib/utils.ts` created, `tailwind.config.ts` updated.

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create .env.example**

```bash
# .env.example
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
AUTH_SECRET=

DATABASE_URL=
DIRECT_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Copy to .env.local and add to .gitignore**

```bash
cp .env.example .env.local
echo ".env.local" >> .gitignore
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with shadcn and Vitest"
```

---

## Task 2: Prisma Schema + DB Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Replace prisma/schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  kakaoId   String   @unique
  username  String   @unique
  name      String
  bio       String?
  avatarUrl String?
  createdAt DateTime @default(now())

  posts     Post[]
  likes     Like[]
  reposts   Repost[]
  followers Follow[] @relation("following")
  following Follow[] @relation("follower")
}

model Post {
  id        String   @id @default(cuid())
  content   String?
  imageUrls String[]
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  likes   Like[]
  reposts Repost[]
}

model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower  User @relation("follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
}

model Repost {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
}
```

- [ ] **Step 3: Fill in DATABASE_URL and DIRECT_URL in .env.local**

From Supabase dashboard → Project Settings → Database → Connection string:
- `DATABASE_URL`: Transaction pooler URL (port 6543) — append `?pgbouncer=true`
- `DIRECT_URL`: Session pooler URL (port 5432)

- [ ] **Step 4: Push schema to DB**

```bash
npx prisma db push
```

Expected: `✓ Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Create lib/prisma.ts**

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 7: Create lib/types.ts**

```typescript
// lib/types.ts
import { Prisma } from "@prisma/client"

export type PostWithMeta = Prisma.PostGetPayload<{
  include: {
    author: { select: { id: true; name: true; username: true; avatarUrl: true } }
    _count: { select: { likes: true; reposts: true } }
    likes: { select: { id: true } }
    reposts: { select: { id: true } }
  }
}>

export type UserWithCounts = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    username: true
    bio: true
    avatarUrl: true
    _count: { select: { followers: true; following: true; posts: true } }
  }
}>
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and client singleton"
```

---

## Task 3: Username Generator (TDD)

**Files:**
- Create: `lib/generate-username.ts`
- Create: `__tests__/lib/generate-username.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/generate-username.test.ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- __tests__/lib/generate-username.test.ts
```

Expected: `Error: Cannot find module '@/lib/generate-username'`

- [ ] **Step 3: Implement lib/generate-username.ts**

```typescript
// lib/generate-username.ts
import { prisma } from "@/lib/prisma"

interface KakaoProfileLike {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
    }
  }
}

export async function generateUniqueUsername(
  profile: KakaoProfileLike
): Promise<string> {
  const base =
    (profile.kakao_account?.profile?.nickname ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15) || "user"

  let username = base
  let count = 0

  while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    count++
    username = `${base}${count}`
  }

  return username
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- __tests__/lib/generate-username.test.ts
```

Expected: `✓ 3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/generate-username.ts __tests__/lib/generate-username.test.ts
git commit -m "feat: add unique username generator with tests"
```

---

## Task 4: Auth.js v5 + Kakao Setup

**Files:**
- Create: `lib/auth.ts`
- Create: `types/next-auth.d.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create Kakao OAuth app**

In [Kakao Developers](https://developers.kakao.com):
1. My Application → New Application
2. Activate Kakao Login
3. Redirect URI: `http://localhost:3000/api/auth/callback/kakao`
4. Required consent items: nickname, profile image
5. Copy REST API Key → `KAKAO_CLIENT_ID`
6. Security → Generate Client Secret → `KAKAO_CLIENT_SECRET`
7. Fill both in `.env.local`

- [ ] **Step 2: Generate AUTH_SECRET**

```bash
npx auth secret
```

Copy the output into `.env.local` as `AUTH_SECRET=<value>`.

- [ ] **Step 3: Create types/next-auth.d.ts**

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string
    username?: string
  }
}
```

- [ ] **Step 4: Create lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import Kakao from "next-auth/providers/kakao"
import { prisma } from "@/lib/prisma"
import { generateUniqueUsername } from "@/lib/generate-username"

interface KakaoProfile {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "kakao" || !profile) return false
      const kp = profile as unknown as KakaoProfile

      await prisma.user.upsert({
        where: { kakaoId: String(kp.id) },
        update: {
          name: kp.kakao_account?.profile?.nickname ?? "사용자",
          avatarUrl: kp.kakao_account?.profile?.profile_image_url ?? null,
        },
        create: {
          kakaoId: String(kp.id),
          name: kp.kakao_account?.profile?.nickname ?? "사용자",
          username: await generateUniqueUsername(kp),
          avatarUrl: kp.kakao_account?.profile?.profile_image_url ?? null,
        },
      })
      return true
    },

    async jwt({ token, account, profile }) {
      if (account?.provider === "kakao" && profile) {
        const kp = profile as unknown as KakaoProfile
        const user = await prisma.user.findUnique({
          where: { kakaoId: String(kp.id) },
          select: { id: true, username: true },
        })
        if (user) {
          token.userId = user.id
          token.username = user.username
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.username = token.username as string
      return session
    },
  },
})
```

- [ ] **Step 5: Create app/api/auth/[...nextauth]/route.ts**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 6: Create middleware.ts**

```typescript
// middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js v5 with KakaoProvider and JWT session"
```

---

## Task 5: Supabase Storage + Upload Route

**Files:**
- Create: `lib/supabase.ts`
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Fill Supabase env vars in .env.local**

From Supabase dashboard → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role secret key

- [ ] **Step 2: Create `posts` storage bucket in Supabase**

Supabase dashboard → Storage → New bucket:
- Name: `posts`
- Public: ✅ (checked)
- Click Create

Then add a Storage Policy:
- Allow INSERT for authenticated users where `(bucket_id = 'posts')`

- [ ] **Step 3: Create lib/supabase.ts**

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"

// Server-only client — uses service role key, never exposed to client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

- [ ] **Step 4: Create app/api/upload/route.ts**

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max file size is 5MB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${session.user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from("posts")
    .upload(path, file, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from("posts").getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts app/api/upload/route.ts
git commit -m "feat: add Supabase Storage upload API route"
```

---

## Task 6: Server Actions (TDD)

**Files:**
- Create: `actions/post.ts`
- Create: `actions/reaction.ts`
- Create: `actions/follow.ts`
- Create: `__tests__/actions/reaction.test.ts`

- [ ] **Step 1: Write failing tests for reaction actions**

```typescript
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- __tests__/actions/reaction.test.ts
```

Expected: `Error: Cannot find module '@/actions/reaction'`

- [ ] **Step 3: Create actions/reaction.ts**

```typescript
// actions/reaction.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function toggleLike(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } })
  } else {
    await prisma.like.create({ data: { userId, postId } })
  }

  revalidatePath("/")
}

export async function toggleRepost(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id
  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.repost.delete({ where: { userId_postId: { userId, postId } } })
  } else {
    await prisma.repost.create({ data: { userId, postId } })
  }

  revalidatePath("/")
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- __tests__/actions/reaction.test.ts
```

Expected: `✓ 5 tests passed`

- [ ] **Step 5: Create actions/post.ts**

```typescript
// actions/post.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const content = (formData.get("content") as string | null)?.trim() || null
  const imageUrls = formData.getAll("imageUrls") as string[]

  if (!content && imageUrls.length === 0) {
    throw new Error("Post must have content or at least one image")
  }

  const post = await prisma.post.create({
    data: { content, imageUrls, authorId: session.user.id },
  })

  revalidatePath("/")
  return post
}

export async function deletePost(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })

  if (!post || post.authorId !== session.user.id) throw new Error("Forbidden")

  await prisma.post.delete({ where: { id: postId } })
  revalidatePath("/")
}
```

- [ ] **Step 6: Create actions/follow.ts**

```typescript
// actions/follow.ts
"use server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function toggleFollow(targetUserId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const followerId = session.user.id
  const followingId = targetUserId

  if (followerId === followingId) throw new Error("Cannot follow yourself")

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })

  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    })
  } else {
    await prisma.follow.create({ data: { followerId, followingId } })
  }

  revalidatePath("/")
}
```

- [ ] **Step 7: Commit**

```bash
git add actions/ __tests__/actions/
git commit -m "feat: add server actions for post, like, repost, and follow"
```

---

## Task 7: next.config.ts + Root Layout + Providers

**Files:**
- Modify: `next.config.ts`
- Create: `components/Providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "http",  hostname: "k.kakaocdn.net" },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Create components/Providers.tsx**

```typescript
// components/Providers.tsx
"use client"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface Props {
  children: React.ReactNode
  session: Session | null
}

export function Providers({ children, session }: Props) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

- [ ] **Step 3: Update app/layout.tsx**

```typescript
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/Providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Community",
  description: "Threads-like SNS",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts app/layout.tsx components/Providers.tsx
git commit -m "feat: configure image domains and root layout with SessionProvider"
```

---

## Task 8: Login Page + Main Layout + Navigation

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(main)/layout.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/NewPostButton.tsx`
- Create: `components/layout/BottomNav.tsx`

- [ ] **Step 1: Create app/(auth)/login/page.tsx**

```typescript
// app/(auth)/login/page.tsx
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">Threads처럼, 우리만의 공간</p>
        <form
          action={async () => {
            "use server"
            await signIn("kakao", { redirectTo: "/" })
          }}
        >
          <Button
            type="submit"
            size="lg"
            className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-semibold w-full max-w-xs"
          >
            카카오로 시작하기
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create components/layout/NewPostButton.tsx**

```typescript
// components/layout/NewPostButton.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NewPostDialog } from "@/components/post/NewPostDialog"
import { Pencil } from "lucide-react"

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
      <NewPostDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
```

- [ ] **Step 3: Create components/layout/Sidebar.tsx**

```typescript
// components/layout/Sidebar.tsx
import Link from "next/link"
import { auth } from "@/lib/auth"
import { Home, User } from "lucide-react"
import { NewPostButton } from "./NewPostButton"

export async function Sidebar() {
  const session = await auth()

  return (
    <nav className="hidden md:flex flex-col w-64 border-r h-screen sticky top-0 p-4 gap-1">
      <Link href="/" className="text-2xl font-bold mb-6 px-3">
        Community
      </Link>
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Home className="h-5 w-5" />
        <span>홈</span>
      </Link>
      {session?.user?.username && (
        <Link
          href={`/${session.user.username}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <User className="h-5 w-5" />
          <span>프로필</span>
        </Link>
      )}
      <div className="mt-auto">
        <NewPostButton />
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create components/layout/BottomNav.tsx**

```typescript
// components/layout/BottomNav.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Home, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { NewPostButton } from "./NewPostButton"

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex items-center justify-around h-16 z-50">
      <Link
        href="/"
        className={cn(
          "flex flex-col items-center p-2",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="h-6 w-6" />
      </Link>
      <NewPostButton mobile />
      {session?.user?.username && (
        <Link
          href={`/${session.user.username}`}
          className={cn(
            "flex flex-col items-center p-2",
            pathname === `/${session.user.username}`
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <User className="h-6 w-6" />
        </Link>
      )}
    </nav>
  )
}
```

- [ ] **Step 5: Create app/(main)/layout.tsx**

```typescript
// app/(main)/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add login page, main layout, sidebar, and bottom nav"
```

---

## Task 9: Core Post Components

**Files:**
- Create: `components/user/UserAvatar.tsx`
- Create: `components/post/PostContent.tsx`
- Create: `components/post/LikeButton.tsx`
- Create: `components/post/RepostButton.tsx`
- Create: `components/post/ShareButton.tsx`
- Create: `components/post/PostActions.tsx`
- Create: `components/post/PostCard.tsx`
- Create: `components/post/PostList.tsx`

- [ ] **Step 1: Create components/user/UserAvatar.tsx**

```typescript
// components/user/UserAvatar.tsx
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Props {
  name: string
  avatarUrl: string | null
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: { container: "h-8 w-8",  text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-16 w-16", text: "text-xl" },
}

export function UserAvatar({ name, avatarUrl, size = "md" }: Props) {
  const { container, text } = sizes[size]
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0",
        container
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill className="object-cover" sizes="64px" />
      ) : (
        <span className={cn("font-semibold text-muted-foreground select-none", text)}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create components/post/PostContent.tsx**

```typescript
// components/post/PostContent.tsx
import Image from "next/image"

interface Props {
  content: string | null
  imageUrls: string[]
}

export function PostContent({ content, imageUrls }: Props) {
  const gridClass =
    imageUrls.length === 1
      ? "grid-cols-1"
      : "grid-cols-2"

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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
```

- [ ] **Step 3: Create components/post/LikeButton.tsx**

```typescript
// components/post/LikeButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleLike } from "@/actions/reaction"

interface Props {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({ postId, initialLiked, initialCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, addOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: newLiked ? state.count + 1 : state.count - 1,
    })
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!optimistic.liked)
      await toggleLike(postId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-sm transition-colors",
        optimistic.liked
          ? "text-red-500"
          : "text-muted-foreground hover:text-red-500"
      )}
    >
      <Heart className={cn("h-5 w-5", optimistic.liked && "fill-current")} />
      <span>{optimistic.count}</span>
    </button>
  )
}
```

- [ ] **Step 4: Create components/post/RepostButton.tsx**

```typescript
// components/post/RepostButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Repeat2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleRepost } from "@/actions/reaction"

interface Props {
  postId: string
  initialReposted: boolean
  initialCount: number
}

export function RepostButton({ postId, initialReposted, initialCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, addOptimistic] = useOptimistic(
    { reposted: initialReposted, count: initialCount },
    (state, newReposted: boolean) => ({
      reposted: newReposted,
      count: newReposted ? state.count + 1 : state.count - 1,
    })
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!optimistic.reposted)
      await toggleRepost(postId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-sm transition-colors",
        optimistic.reposted
          ? "text-green-500"
          : "text-muted-foreground hover:text-green-500"
      )}
    >
      <Repeat2 className="h-5 w-5" />
      <span>{optimistic.count}</span>
    </button>
  )
}
```

- [ ] **Step 5: Create components/post/ShareButton.tsx**

```typescript
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
```

- [ ] **Step 6: Create components/post/PostActions.tsx**

```typescript
// components/post/PostActions.tsx
import { LikeButton } from "./LikeButton"
import { RepostButton } from "./RepostButton"
import { ShareButton } from "./ShareButton"

interface Props {
  postId: string
  likeCount: number
  repostCount: number
  isLiked: boolean
  isReposted: boolean
}

export function PostActions({
  postId,
  likeCount,
  repostCount,
  isLiked,
  isReposted,
}: Props) {
  return (
    <div className="flex items-center gap-4 mt-3">
      <LikeButton postId={postId} initialLiked={isLiked} initialCount={likeCount} />
      <RepostButton postId={postId} initialReposted={isReposted} initialCount={repostCount} />
      <ShareButton postId={postId} />
    </div>
  )
}
```

- [ ] **Step 7: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 8: Create components/post/PostCard.tsx**

```typescript
// components/post/PostCard.tsx
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { UserAvatar } from "@/components/user/UserAvatar"
import { PostContent } from "./PostContent"
import { PostActions } from "./PostActions"
import type { PostWithMeta } from "@/lib/types"

interface Props {
  post: PostWithMeta
  currentUserId: string
}

export function PostCard({ post, currentUserId }: Props) {
  const isLiked = post.likes.length > 0
  const isReposted = post.reposts.length > 0

  return (
    <article className="border-b px-4 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <Link href={`/${post.author.username}`} className="flex-shrink-0">
          <UserAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/${post.author.username}`}
              className="font-semibold text-sm hover:underline"
            >
              {post.author.name}
            </Link>
            <span className="text-muted-foreground text-xs">
              @{post.author.username}
            </span>
            <span className="text-muted-foreground text-xs ml-auto">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          <Link href={`/post/${post.id}`}>
            <PostContent content={post.content} imageUrls={post.imageUrls} />
          </Link>
          <PostActions
            postId={post.id}
            likeCount={post._count.likes}
            repostCount={post._count.reposts}
            isLiked={isLiked}
            isReposted={isReposted}
          />
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 9: Create components/post/PostList.tsx**

```typescript
// components/post/PostList.tsx
import { PostCard } from "./PostCard"
import type { PostWithMeta } from "@/lib/types"

interface Props {
  posts: PostWithMeta[]
  currentUserId: string
}

export function PostList({ posts, currentUserId }: Props) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">아직 게시글이 없어요</p>
        <p className="text-sm mt-1">첫 번째 글을 올려보세요!</p>
      </div>
    )
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
```

- [ ] **Step 10: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add post components with optimistic like/repost buttons"
```

---

## Task 10: New Post Dialog + Image Uploader

**Files:**
- Create: `components/post/ImageUploader.tsx`
- Create: `components/post/NewPostDialog.tsx`

- [ ] **Step 1: Create components/post/ImageUploader.tsx**

```typescript
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
        <div
          className={`grid gap-1 ${imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
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
```

- [ ] **Step 2: Create components/post/NewPostDialog.tsx**

```typescript
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
          <ImageUploader
            imageUrls={imageUrls}
            onChange={setImageUrls}
            maxImages={4}
          />
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
```

- [ ] **Step 3: Commit**

```bash
git add components/post/ImageUploader.tsx components/post/NewPostDialog.tsx
git commit -m "feat: add new post dialog with multi-image upload"
```

---

## Task 11: Home Feed Page

**Files:**
- Create: `components/feed/FeedTabs.tsx`
- Create: `app/(main)/page.tsx`

- [ ] **Step 1: Create components/feed/FeedTabs.tsx**

```typescript
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
```

- [ ] **Step 2: Create app/(main)/page.tsx**

```typescript
// app/(main)/page.tsx
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FeedTabs } from "@/components/feed/FeedTabs"
import { PostList } from "@/components/post/PostList"

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const { tab } = await searchParams
  const session = await auth()
  const userId = session!.user.id

  const posts = await prisma.post.findMany({
    where:
      tab === "following"
        ? { author: { followers: { some: { followerId: userId } } } }
        : undefined,
    include: {
      author: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
      _count: { select: { likes: true, reposts: true } },
      likes: { where: { userId }, select: { id: true } },
      reposts: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return (
    <div className="max-w-lg mx-auto">
      <Suspense>
        <FeedTabs />
      </Suspense>
      <PostList posts={posts} currentUserId={userId} />
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and verify login flow**

```bash
npm run dev
```

1. Visit `http://localhost:3000` — should redirect to `/login`
2. Click "카카오로 시작하기" — Kakao OAuth flow
3. On success — redirected to `/` with feed displayed
4. FAB button → NewPostDialog opens
5. Type text, click 올리기 → post appears in feed

- [ ] **Step 4: Commit**

```bash
git add components/feed/FeedTabs.tsx app/\(main\)/page.tsx
git commit -m "feat: add home feed with 전체/팔로잉 tabs"
```

---

## Task 12: User Profile Page

**Files:**
- Create: `components/user/FollowButton.tsx`
- Create: `components/user/ProfileHeader.tsx`
- Create: `app/(main)/[username]/page.tsx`

- [ ] **Step 1: Create components/user/FollowButton.tsx**

```typescript
// components/user/FollowButton.tsx
"use client"
import { useOptimistic, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toggleFollow } from "@/actions/follow"

interface Props {
  targetUserId: string
  initialFollowing: boolean
}

export function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isFollowing, addOptimistic] = useOptimistic(
    initialFollowing,
    (_, next: boolean) => next
  )

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!isFollowing)
      await toggleFollow(targetUserId)
    })
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </Button>
  )
}
```

- [ ] **Step 2: Create components/user/ProfileHeader.tsx**

```typescript
// components/user/ProfileHeader.tsx
import { UserAvatar } from "./UserAvatar"
import { FollowButton } from "./FollowButton"
import type { UserWithCounts } from "@/lib/types"

interface Props {
  user: UserWithCounts
  isFollowing: boolean
  isOwnProfile: boolean
}

export function ProfileHeader({ user, isFollowing, isOwnProfile }: Props) {
  return (
    <div className="px-4 py-6 border-b">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{user.name}</h1>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
          <div className="flex gap-4 mt-3 text-sm">
            <span>
              <strong>{user._count.followers}</strong>
              <span className="text-muted-foreground ml-1">팔로워</span>
            </span>
            <span>
              <strong>{user._count.following}</strong>
              <span className="text-muted-foreground ml-1">팔로잉</span>
            </span>
          </div>
        </div>
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
      </div>
      {!isOwnProfile && (
        <div className="mt-4">
          <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create app/(main)/[username]/page.tsx**

```typescript
// app/(main)/[username]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileHeader } from "@/components/user/ProfileHeader"
import { PostList } from "@/components/post/PostList"

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const session = await auth()
  const currentUserId = session!.user.id

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  })

  if (!user) notFound()

  const [isFollowingRecord, posts] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: user.id,
        },
      },
    }),
    prisma.post.findMany({
      where: { authorId: user.id },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: { select: { likes: true, reposts: true } },
        likes: { where: { userId: currentUserId }, select: { id: true } },
        reposts: { where: { userId: currentUserId }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <div className="max-w-lg mx-auto">
      <ProfileHeader
        user={user}
        isFollowing={isFollowingRecord !== null}
        isOwnProfile={user.id === currentUserId}
      />
      <PostList posts={posts} currentUserId={currentUserId} />
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

1. Click on a username in the feed → profile page loads
2. Follow button appears (not on own profile)
3. Clicking Follow → optimistic update, follower count increments after refresh

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add user profile page with follow button"
```

---

## Task 13: Post Detail Page + Final Checks

**Files:**
- Create: `app/(main)/post/[id]/page.tsx`

- [ ] **Step 1: Create app/(main)/post/[id]/page.tsx**

```typescript
// app/(main)/post/[id]/page.tsx
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PostCard } from "@/components/post/PostCard"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const currentUserId = session!.user.id

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
      _count: { select: { likes: true, reposts: true } },
      likes: { where: { userId: currentUserId }, select: { id: true } },
      reposts: { where: { userId: currentUserId }, select: { id: true } },
    },
  })

  if (!post) notFound()

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 py-3 border-b text-sm font-semibold">게시글</div>
      <PostCard post={post} currentUserId={currentUserId} />
      <div className="px-4 py-4 text-sm text-muted-foreground border-t">
        좋아요 {post._count.likes}개 · 리포스트 {post._count.reposts}개
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/post/
git commit -m "feat: add post detail page"
```

---

## Task 14: Deploy to Vercel

- [ ] **Step 1: Install Vercel CLI (if not installed)**

```bash
npm i -g vercel
```

- [ ] **Step 2: Link project**

```bash
vercel link
```

Follow prompts: create new project named `community`.

- [ ] **Step 3: Add environment variables**

```bash
vercel env add KAKAO_CLIENT_ID production
vercel env add KAKAO_CLIENT_SECRET production
vercel env add AUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

- [ ] **Step 4: Add production redirect URI in Kakao developer console**

Add: `https://<your-vercel-domain>/api/auth/callback/kakao`

- [ ] **Step 5: Deploy to production**

```bash
vercel --prod
```

Expected: Deployment URL printed. Visit and verify Kakao login works end-to-end.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: add deployment notes and final cleanup"
git push origin main
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| Kakao social login | Task 4 (Auth.js KakaoProvider) |
| Feed — 전체 탭 | Task 11 (page.tsx, no filter) |
| Feed — 팔로잉 탭 | Task 11 (page.tsx, follower filter) |
| 텍스트 + 사진 게시글 | Task 6 (createPost), Task 10 (NewPostDialog + ImageUploader) |
| 팔로우 / 팔로잉 | Task 6 (toggleFollow), Task 12 (FollowButton) |
| 좋아요 (Optimistic) | Task 6 (toggleLike), Task 9 (LikeButton) |
| 리포스트 (Optimistic) | Task 6 (toggleRepost), Task 9 (RepostButton) |
| 링크 복사 공유 | Task 9 (ShareButton) |
| 유저 프로필 페이지 | Task 12 |
| 게시글 상세 페이지 | Task 13 |
| Vercel 배포 | Task 14 |
| 이미지 최대 4장 / 5MB | Task 5 (upload route), Task 10 (ImageUploader) |
| No replies (MVP 제외) | ✅ Not implemented |
| No notifications (MVP 제외) | ✅ Not implemented |
| No search (MVP 제외) | ✅ Not implemented |

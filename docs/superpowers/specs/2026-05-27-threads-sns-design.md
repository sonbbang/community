# Threads-like SNS — Design Spec
**Date:** 2026-05-27  
**Project:** community (C:\Users\n3299\git\community)  
**Status:** Approved

---

## 1. Overview

카카오 소셜 로그인 기반의 Threads 유사 SNS. Next.js 15 + Vercel 배포, Supabase PostgreSQL + Prisma ORM, Auth.js v5 KakaoProvider 조합.

### MVP 범위 (포함)
- 카카오 소셜 로그인
- 피드 (전체 탭 + 팔로잉 탭)
- 텍스트 + 사진(최대 4장) 게시글 작성
- 팔로우 / 팔로잉
- 좋아요
- 리포스트 + 링크 복사 공유

### MVP 제외
- 댓글 / 답글 (Threaded replies)
- 알림 (Notifications)
- 탐색 / 검색

---

## 2. Tech Stack

| 역할 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 인증 | Auth.js v5 (`next-auth@beta`) + KakaoProvider |
| ORM | Prisma |
| DB | Supabase PostgreSQL |
| 파일 저장 | Supabase Storage |
| UI | Tailwind CSS + shadcn/ui |
| 상태관리 | Zustand (최소 클라이언트 상태) |
| 배포 | Vercel (Fluid Compute) |

---

## 3. Architecture

```
Vercel (Fluid Compute)
├── Next.js 15 App Router
│   ├── Server Components  → SSR 피드, 프로필
│   ├── Server Actions     → 좋아요, 팔로우, 글쓰기 mutations
│   └── Route Handlers     → /api/auth/[...nextauth], /api/upload
│
├── Auth.js v5 ──── KakaoProvider ──── Kakao OAuth 2.0
│
├── Prisma ORM ───────────────────── Supabase PostgreSQL
│
└── Supabase Storage ◄───────────── 이미지 업로드
```

---

## 4. Data Model (Prisma Schema)

```prisma
model User {
  id        String   @id @default(cuid())
  kakaoId   String   @unique
  username  String   @unique   // @handle
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
  content   String?            // optional (이미지만도 가능)
  imageUrls String[]           // Supabase Storage public URL 배열
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  likes     Like[]
  reposts   Repost[]
}

model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User @relation("follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following   User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
}

model Repost {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
}
```

---

## 5. Page Structure & Routing

```
app/
├── layout.tsx                    # 루트 레이아웃 (Provider, 폰트)
├── (auth)/
│   └── login/
│       └── page.tsx              # 카카오 로그인 버튼
├── (main)/
│   ├── layout.tsx                # Sidebar(PC) + BottomNav(모바일)
│   ├── page.tsx                  # 홈 피드 (전체 | 팔로잉 탭)
│   ├── [username]/
│   │   └── page.tsx              # 유저 프로필 + 게시글 목록
│   └── post/
│       └── [id]/
│           └── page.tsx          # 게시글 상세
├── api/
│   ├── auth/[...nextauth]/
│   │   └── route.ts              # Auth.js 핸들러
│   └── upload/
│       └── route.ts              # Supabase Storage 업로드
└── actions/
    ├── post.ts                   # createPost, deletePost
    ├── follow.ts                 # toggleFollow
    └── like.ts                   # toggleLike, toggleRepost

lib/
├── auth.ts                       # Auth.js 설정
├── prisma.ts                     # Prisma 싱글톤
└── supabase.ts                   # Supabase Storage 클라이언트
```

### 미들웨어 (인증 가드)
```typescript
// middleware.ts
export { auth as middleware } from "@/lib/auth"
export const config = {
  matcher: ["/((?!login|api/auth|_next|_static|favicon).*)"]
}
```

---

## 6. Auth Flow (Kakao OAuth)

1. `/login` → "카카오로 시작하기" 버튼 클릭
2. Auth.js → Kakao OAuth 리다이렉트
3. 카카오 동의 화면 → code 반환
4. Auth.js `signIn` callback:
   - `kakaoId`로 User 조회
   - 없으면 신규 생성 (`upsert`) — username 자동 생성 (닉네임 + 랜덤 suffix)
5. JWT 세션 발급 → `/` 리다이렉트

### 세션 확장
```typescript
// session에 DB userId 포함
callbacks: {
  session: ({ session, token }) => ({
    ...session,
    user: { ...session.user, id: token.sub! }
  })
}
```

---

## 7. Key Components

```
(main)/layout.tsx
├── <Sidebar />           # PC 좌측 네비 (홈, 프로필 링크 + NewPost FAB)
└── <BottomNav />         # 모바일 하단 탭바

<PostCard />
├── <UserAvatar />
├── <PostContent />       # 텍스트 + 이미지 그리드 (최대 4장)
└── <PostActions />
    ├── <LikeButton />    # toggleLike Server Action + useOptimistic
    ├── <RepostButton />  # toggleRepost Server Action + useOptimistic
    └── <ShareButton />   # navigator.clipboard (클라이언트)

<NewPostDialog />         # shadcn Dialog
├── <Textarea />
├── <ImageUploader />     # 드래그앤드롭, 미리보기, 최대 4장
└── <SubmitButton />      # createPost Server Action
```

---

## 8. Image Upload Flow

```
클라이언트 → POST /api/upload (FormData)
           → Supabase Storage: posts/{userId}/{timestamp}-{filename}
           → 반환: { url: "https://...supabase.co/storage/..." }
           → createPost Server Action (content, imageUrls[])
           → prisma.post.create
```

- 버킷: `posts` (public read / authenticated write)
- 경로 패턴: `posts/{userId}/{Date.now()}-{originalName}`
- 제한: 파일당 최대 5MB, 최대 4장, image/* 타입만

---

## 9. Environment Variables

```env
# Kakao OAuth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# Auth.js
AUTH_SECRET=          # openssl rand -base64 32

# Supabase
DATABASE_URL=         # Supabase > Project Settings > Database > Connection string (Prisma)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # 서버에서 Storage 업로드용
```

---

## 10. UX Flow Summary

```
비로그인 → /login → 카카오 로그인 → / (홈 피드)

홈 피드
├── 전체 탭: 모든 유저 최신 글 (시간순)
├── 팔로잉 탭: 팔로우 유저 글만
└── FAB → NewPostDialog → 작성 → 피드 갱신

PostCard
├── 좋아요 → toggleLike (Optimistic Update)
├── 리포스트 → toggleRepost (Optimistic Update)
├── 링크 복사 → navigator.clipboard.writeText
└── 클릭 → /post/[id]

프로필 /[username]
├── 팔로우 버튼 → toggleFollow
└── 해당 유저 게시글 목록
```

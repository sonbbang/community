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

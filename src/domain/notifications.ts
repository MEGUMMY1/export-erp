import type { Notification, User } from './types'

/** 이 사용자가 받는 알림인가 (본인이 한 행동은 제외) */
export const isRecipient = (n: Notification, user: User) =>
  n.actorId !== user.id && (n.roles.includes(user.role) || (n.userIds?.includes(user.id) ?? false))

export const notificationsFor = (all: Notification[], user: User) =>
  all.filter((n) => isRecipient(n, user)).sort((a, b) => b.at.localeCompare(a.at))

export const isUnread = (n: Notification, userId: string) => !n.readBy.includes(userId)

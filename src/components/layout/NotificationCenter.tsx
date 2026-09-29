import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import circleCheck from '@/assets/icons/circle-check.svg'
import circleClose from '@/assets/icons/circle-close.svg'
import circleInfo from '@/assets/icons/circle-exclamation-info.svg'
import triangle from '@/assets/icons/triangle-exclamation.svg'
import { Button } from '@/components/ui'
import { formatDateTime, formatRelative } from '@/domain/format'
import { isUnread, notificationsFor } from '@/domain/notifications'
import type { NotificationSeverity } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useCurrentUser, useData, useErpStore } from '@/store'

const ICON: Record<NotificationSeverity, string> = {
  error: circleClose,
  warning: triangle,
  info: circleInfo,
  success: circleCheck,
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 20.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** 알림 센터 — 업무가 일어난 순간 담당자에게 전달된 알림 */
export function NotificationCenter() {
  const data = useData()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const markRead = useErpStore((s) => s.markNotificationsRead)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const items = notificationsFor(data.notifications, user)
  const unread = items.filter((n) => isUnread(n, user.id))

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`알림 ${unread.length}건 안 읽음`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('relative flex size-10 items-center justify-center rounded-lg text-gray-80 transition-colors hover:bg-gray-10', open && 'bg-gray-10')}
      >
        <BellIcon />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-50 px-1 text-label-xs text-white">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-100 overflow-hidden rounded-xl border border-gray-30 bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-gray-30 px-5 py-3.5">
            <p className="text-subtitle-md">
              알림 <span className="text-body-sm text-gray-70">· 안 읽음 {unread.length}</span>
            </p>
            <Button variant="text" size="sm" disabled={!unread.length} onClick={() => markRead(unread.map((n) => n.id))}>
              모두 읽음
            </Button>
          </header>
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-body-sm text-gray-70">받은 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-120 divide-y divide-gray-20 overflow-y-auto">
              {items.map((n) => {
                const fresh = isUnread(n, user.id)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        markRead([n.id])
                        setOpen(false)
                        navigate(n.link)
                      }}
                      className={cn(
                        'flex w-full gap-3 px-5 py-3.5 text-left transition-colors',
                        // 안 읽음: 흰 배경 / 읽음: 회색 배경(흐리게) — 호버 색도 서로 구분
                        fresh ? 'bg-white hover:bg-gray-10' : 'bg-gray-10 hover:bg-gray-20',
                      )}
                    >
                      <img src={ICON[n.severity]} width={20} height={20} alt="" className={cn('mt-0.5 size-5 shrink-0', !fresh && 'opacity-50')} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('text-body-md-m', fresh ? 'text-gray-90' : 'text-gray-70')}>{n.title}</span>
                          {fresh && <span className="size-1.5 rounded-full bg-red-50" aria-label="안 읽음" />}
                        </span>
                        <span className={cn('line-clamp-2 block text-caption-md', fresh ? 'text-gray-80' : 'text-gray-70')}>{n.message}</span>
                        <span className="block text-caption-sm text-gray-50" title={formatDateTime(n.at)}>
                          {formatRelative(n.at)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

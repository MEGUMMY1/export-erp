import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ROLE_LABEL, TODAY } from '@/domain/constants'
import { dday, formatDate } from '@/domain/format'
import { cn } from '@/lib/cn'
import { useCurrentUser, useData, useErpStore } from '@/store'
import { Dropdown, Modal, toast } from '@/components/ui'
import { isUnread, notificationsFor } from '@/domain/notifications'
import { NotificationCenter } from './NotificationCenter'
import { usePageTitleStore } from './pageTitle'

const NAV = [
  { section: '현황', items: [{ to: '/workbench', label: '업무 현황' }] },
  {
    section: '업무 등록',
    items: [
      { to: '/purchases/new', label: '매입 등록' },
      { to: '/sales/new', label: '판매 등록' },
    ],
  },
  { section: '선적', items: [{ to: '/shipments', label: '선적 승인' }] },
  { section: '도움말', items: [{ to: '/guide', label: '판정 기준' }] },
]

export function AppLayout() {
  const data = useData()
  const user = useCurrentUser()
  const setCurrentUser = useErpStore((s) => s.setCurrentUser)
  const resetDemo = useErpStore((s) => s.resetDemo)
  const page = usePageTitleStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [resetOpen, setResetOpen] = useState(false)

  // 화면이 바뀌면 맨 위부터 보여준다
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // 사용자가 바뀌면 그 사람에게 도착한 새 알림을 알려준다
  // (StrictMode에서 이펙트가 두 번 실행돼도 같은 사용자에게는 한 번만)
  const announcedUserId = useRef<string | null>(null)
  useEffect(() => {
    if (announcedUserId.current === user.id) return
    announcedUserId.current = user.id
    const unread = notificationsFor(useErpStore.getState().data.notifications, user).filter((n) => isUnread(n, user.id))
    if (unread.length) toast.info(`${user.name} ${user.title} · 새 알림 ${unread.length}건`)
  }, [user])

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-65 shrink-0 flex-col bg-gray-100 px-3">
        <div className="border-b border-gray-90 px-4 py-6">
          <p className="text-label-xs text-gray-70">K-AUTO GLOBAL</p>
          <p className="mt-1 text-title-md text-gray-10">수출 관리</p>
        </div>
        <nav className="flex flex-col gap-5 py-5">
          {NAV.map((group) => (
            <div key={group.section} className="flex flex-col gap-2">
              <p className="px-1 text-label-xs text-gray-70">{group.section}</p>
              {group.items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-4 py-3 text-label-lg transition-colors',
                      isActive ? 'bg-gray-90 text-gray-10' : 'text-gray-50 hover:bg-black hover:text-gray-10',
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-gray-90 px-1 py-5">
          <div className="flex items-center justify-between">
            <p className="text-label-xs text-gray-70">시연 사용자</p>
            <button type="button" onClick={() => setResetOpen(true)} className="text-label-xs text-gray-50 hover:text-gray-10">
              데모 초기화
            </button>
          </div>
          <Dropdown
            size="sm"
            placement="top"
            value={user.id}
            onChange={setCurrentUser}
            options={data.users.map((u) => ({
              value: u.id,
              label: `[${ROLE_LABEL[u.role]}] ${u.name} ${u.title}`,
            }))}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-6 border-b border-gray-30 bg-white px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="shrink-0 text-title-md text-gray-100">{page.title}</h1>
            {page.description && <p className="truncate text-body-sm text-gray-70">{page.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-body-sm text-gray-70">
            <span>기준일 {formatDate(TODAY)}</span>
            <span className="text-gray-40">|</span>
            <span>
              부가세 예정신고 마감 {formatDate(data.policy.vatFilingDeadline)}{' '}
              <b className="text-gray-90">{dday(data.policy.vatFilingDeadline)}</b>
            </span>
            <NotificationCenter />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-8 pt-6 pb-24">
          <Outlet />
        </main>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="데모를 초기화할까요?"
        description="시연 중 등록·결재·선적한 내용이 모두 사라지고 처음 데이터로 돌아갑니다."
        cancel={{ label: '취소', onClick: () => setResetOpen(false) }}
        confirm={{
          label: '초기화',
          onClick: () => {
            resetDemo()
            announcedUserId.current = null
            setResetOpen(false)
            navigate('/workbench')
            toast.success('데모 데이터를 초기화했습니다')
          },
        }}
      />
    </div>
  )
}

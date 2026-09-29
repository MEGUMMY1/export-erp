import { NavLink, Outlet } from 'react-router'
import { ROLE_LABEL, TODAY } from '../../domain/constants'
import { dday } from '../../domain/format'
import { cn } from '../../lib/cn'
import { useCurrentUser, useData, useErpStore } from '../../store'
import { Dropdown } from '../ui'

const NAV = [
  { section: '검증', items: [{ to: '/workbench', label: '검증 작업 큐' }] },
  {
    section: '업무 등록',
    items: [
      { to: '/purchases/new', label: '매입 등록' },
      { to: '/sales/new', label: '판매 등록' },
    ],
  },
  { section: '선적', items: [{ to: '/shipments', label: '선적 전표 · 결재' }] },
]

export function AppLayout() {
  const data = useData()
  const user = useCurrentUser()
  const setCurrentUser = useErpStore((s) => s.setCurrentUser)

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-65 shrink-0 flex-col bg-gray-100 px-3">
        <div className="border-b border-gray-90 px-4 py-6">
          <p className="text-label-xs text-gray-70">K-AUTO GLOBAL</p>
          <p className="mt-1 text-title-md text-gray-10">수출 ERP</p>
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
          <p className="text-label-xs text-gray-70">시연 사용자</p>
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
        <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-4 border-b border-gray-30 bg-white px-8 text-body-sm text-gray-70">
          <span>기준일 {TODAY}</span>
          <span className="text-gray-40">|</span>
          <span>
            부가세 예정신고 마감 {data.policy.vatFilingDeadline}{' '}
            <b className="text-gray-90">{dday(data.policy.vatFilingDeadline)}</b>
          </span>
        </header>
        <main className="min-w-0 flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

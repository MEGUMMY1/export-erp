import { NavLink, Outlet } from 'react-router'
import { ROLE_LABEL, TODAY } from '../../domain/constants'
import { dday } from '../../domain/format'
import { useCurrentUser, useData, useErpStore } from '../../store'
import { cn } from '../../lib/cn'

const NAV = [
  { to: '/workbench', label: '검증 작업 큐', desc: '내가 처리할 차량' },
  { to: '/purchases/new', label: '매입 등록', desc: 'VIN 조회 · 증빙' },
  { to: '/sales/new', label: '판매 등록', desc: '매입·매출 크로스체크' },
  { to: '/shipments', label: '선적 전표 · 결재', desc: '결재 · 선적 처리' },
]

export function AppLayout() {
  const data = useData()
  const user = useCurrentUser()
  const setCurrentUser = useErpStore((s) => s.setCurrentUser)

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-brand-90 text-white">
        <div className="px-6 py-6">
          <p className="text-label-sm text-brand-30">K-AUTO GLOBAL</p>
          <p className="mt-1 text-subtitle-lg">수출 ERP</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn('rounded-lg px-3 py-2.5 transition-colors', isActive ? 'bg-brand-70' : 'hover:bg-brand-80')
              }
            >
              <p className="text-body-md-m">{n.label}</p>
              <p className="text-caption-sm text-brand-30">{n.desc}</p>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-30 bg-white px-8">
          <div className="flex items-center gap-4 text-body-sm text-gray-70">
            <span>기준일 {TODAY}</span>
            <span className="text-gray-40">|</span>
            <span>
              부가세 예정신고 마감 {data.policy.vatFilingDeadline}{' '}
              <b className="text-gray-90">{dday(data.policy.vatFilingDeadline)}</b>
            </span>
          </div>
          <label className="flex items-center gap-2 text-body-sm text-gray-70">
            시연 사용자
            <select
              value={user.id}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="h-9 rounded-lg border border-gray-40 bg-white px-3 text-body-md-m text-gray-90"
            >
              {data.users.map((u) => (
                <option key={u.id} value={u.id}>
                  [{ROLE_LABEL[u.role]}] {u.name} {u.title}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main className="min-w-0 flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

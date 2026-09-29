import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  title: ReactNode
  actions?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/** 섹션 카드 — 본문 여백은 여기서만 준다 (내부 요소에 따로 패딩을 두지 않는다) */
export function Panel({ title, actions, id, className, children }: PanelProps) {
  return (
    <section id={id} className={cn('rounded-xl border border-gray-30 bg-white', className)}>
      <header className="flex min-h-13 items-center justify-between gap-3 border-b border-gray-30 px-5 py-3">
        <h2 className="text-subtitle-md text-gray-90">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex flex-col gap-5 px-5 py-4">{children}</div>
    </section>
  )
}

/** 라벨-값 한 줄 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption-md text-gray-70">{label}</dt>
      <dd className="text-body-md text-gray-90">{children}</dd>
    </div>
  )
}

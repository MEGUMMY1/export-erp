import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex border-b border-gray-30', className)}>
      {items.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-6 py-3.5 text-title-sm transition-colors',
              active ? 'border-brand-70 text-brand-70' : 'border-transparent text-gray-70 hover:text-gray-90',
            )}
          >
            {t.label}
            {t.count != null && <span className={cn('text-label-lg', active ? 'text-brand-60' : 'text-gray-50')}>{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

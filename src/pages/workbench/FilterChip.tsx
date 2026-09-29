import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** 필터 선택 칩 (Outlined Default / Selected) */
export function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-label-lg transition-colors',
        selected ? 'border-brand-60 bg-white text-brand-60' : 'border-gray-40 bg-white text-gray-80 hover:bg-gray-10',
      )}
    >
      {children}
    </button>
  )
}

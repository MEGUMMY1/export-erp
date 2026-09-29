import chevronRight from '../../assets/icons/chevron-right.svg'
import { cn } from '../../lib/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** 한 번에 보여줄 페이지 번호 개수 */
  window?: number
  className?: string
}

export function Pagination({ page, pageCount, onChange, window = 5, className }: PaginationProps) {
  if (pageCount <= 1) return null
  const start = Math.max(1, Math.min(page - Math.floor(window / 2), pageCount - window + 1))
  const pages = Array.from({ length: Math.min(window, pageCount) }, (_, i) => start + i)

  const arrow = (dir: -1 | 1) => {
    const target = page + dir
    const disabled = target < 1 || target > pageCount
    return (
      <button
        type="button"
        aria-label={dir < 0 ? '이전 페이지' : '다음 페이지'}
        disabled={disabled}
        onClick={() => onChange(target)}
        className="flex size-6 items-center justify-center disabled:cursor-not-allowed disabled:opacity-30"
      >
        <img src={chevronRight} width={24} height={24} alt="" className={cn('size-6', dir < 0 && 'rotate-180')} />
      </button>
    )
  }

  return (
    <nav aria-label="페이지" className={cn('flex items-center gap-2', className)}>
      {arrow(-1)}
      <div className="flex items-center gap-[5px]">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={cn(
              'flex h-8 min-w-8 items-center justify-center rounded-lg px-[5px] text-body-lg text-gray-90 transition-colors',
              p === page ? 'bg-gray-10 font-semibold' : 'hover:bg-gray-10',
            )}
          >
            {p}
          </button>
        ))}
      </div>
      {arrow(1)}
    </nav>
  )
}

import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// 상태 칩: 성공·주의·오류·진행·대기·예정·어두움
export type ChipTone = 'default' | 'success' | 'warning' | 'error' | 'progress' | 'waiting' | 'scheduled' | 'dark'
type Size = 'lg' | 'md' | 'sm'

const toneClass: Record<ChipTone, string> = {
  default: 'bg-gray-20 border-gray-40 text-gray-90',
  success: 'bg-green-10 border-green-30 text-green-60',
  warning: 'bg-orange-10 border-orange-30 text-orange-60',
  error: 'bg-red-10 border-red-30 text-red-60',
  progress: 'bg-blue-10 border-blue-30 text-blue-60',
  waiting: 'bg-gray-10 border-gray-60 text-gray-70',
  scheduled: 'bg-brand-10 border-brand-30 text-brand-70',
  dark: 'bg-gray-90 border-gray-90 text-gray-10',
}

const sizeClass: Record<Size, string> = {
  lg: 'h-7 px-3 text-label-lg',
  md: 'h-6 px-2.5 text-caption-md-m',
  sm: 'h-5 px-2 text-caption-sm',
}

interface ChipProps {
  tone?: ChipTone
  size?: Size
  className?: string
  children: ReactNode
}

export function Chip({ tone = 'default', size = 'sm', className, children }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-full border whitespace-nowrap',
        toneClass[tone],
        sizeClass[size],
        className,
      )}
    >
      {children}
    </span>
  )
}

import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'solid' | 'outlined' | 'outlined-gray' | 'outlined-red' | 'text'
type Size = 'lg' | 'md' | 'sm'

const variantClass: Record<Variant, string> = {
  solid:
    'bg-brand-70 text-gray-10 hover:bg-brand-80 active:bg-brand-90 disabled:bg-gray-30 disabled:text-gray-60',
  outlined:
    'border border-brand-70 text-brand-70 hover:bg-brand-10 active:bg-brand-20 disabled:border-gray-40 disabled:bg-transparent disabled:text-gray-50',
  'outlined-gray':
    'border border-gray-40 text-gray-70 hover:bg-gray-10 active:bg-gray-20 disabled:bg-transparent disabled:text-gray-50',
  'outlined-red':
    'border border-red-50 text-red-50 hover:bg-red-10 disabled:border-gray-40 disabled:bg-transparent disabled:text-gray-50',
  text: 'rounded-[4px] text-brand-70 hover:bg-gray-10 disabled:bg-transparent disabled:text-gray-50',
}

const sizeClass: Record<Size, string> = {
  lg: 'h-13 px-5 text-btn-lg',
  md: 'h-[42px] px-4 text-btn-md',
  sm: 'h-8 px-3 text-btn-sm',
}

const textSizeClass: Record<Size, string> = {
  lg: 'h-8 px-1 text-btn-lg',
  md: 'h-8 px-1 text-btn-md',
  sm: 'h-6 px-1 text-btn-sm',
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'solid', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-60',
        'disabled:cursor-not-allowed',
        variant === 'text' ? textSizeClass[size] : cn('rounded-lg', sizeClass[size]),
        variantClass[variant],
        className,
      )}
      {...props}
    />
  )
}

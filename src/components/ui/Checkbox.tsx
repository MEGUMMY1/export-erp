import type { ComponentProps, ReactNode } from 'react'
import checkWhite from '../../assets/icons/check-white.svg'
import { cn } from '../../lib/cn'

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: ReactNode
}

export function Checkbox({ label, className, disabled, checked, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-body-lg text-gray-80', disabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}>
      <span className="relative flex size-4.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className={cn(
            'peer size-4.5 appearance-none rounded-[4px] border transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-60',
            disabled
              ? 'border-gray-40 bg-gray-20'
              : 'border-gray-40 bg-white hover:border-gray-50 hover:bg-gray-10 checked:border-brand-60 checked:bg-brand-60 checked:hover:bg-brand-60',
          )}
          {...props}
        />
        {checked && <img src={checkWhite} alt="" className="pointer-events-none absolute size-4.5" />}
      </span>
      {label}
    </label>
  )
}

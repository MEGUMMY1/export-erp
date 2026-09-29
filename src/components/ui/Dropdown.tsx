import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import checkIcon from '../../assets/icons/check.svg'
import chevronDown from '../../assets/icons/chevron-down.svg'
import { cn } from '../../lib/cn'

export interface DropdownOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

type Size = 'lg' | 'sm'

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[]
  value?: T | null
  onChange: (value: T) => void
  placeholder?: string
  size?: Size
  /** 상단 라벨 */
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
  readOnly?: boolean
  /** 목록이 펼쳐지는 방향 (화면 하단에 놓일 때 'top') */
  placement?: 'bottom' | 'top'
  className?: string
}

const triggerSize: Record<Size, string> = {
  lg: 'h-13 px-4 text-body-lg',
  sm: 'h-[42px] px-3 text-label-md',
}

const optionSize: Record<Size, string> = {
  lg: 'h-10',
  sm: 'h-8',
}

export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = '선택',
  size = 'lg',
  label,
  required = false,
  error,
  disabled = false,
  readOnly = false,
  placement = 'bottom',
  className,
}: DropdownProps<T>) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const selected = options.find((o) => o.value === value)
  const interactive = !disabled && !readOnly

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const openMenu = () => {
    if (!interactive) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const select = (option: DropdownOption<T>) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const move = (step: number) => {
    if (!options.length) return
    let next = active
    for (let i = 0; i < options.length; i++) {
      next = (next + step + options.length) % options.length
      if (!options[next].disabled) break
    }
    setActive(next)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!interactive) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') move(1)
    else if (e.key === 'ArrowUp') move(-1)
    else if (e.key === 'Enter' || e.key === ' ') {
      if (options[active]) select(options[active])
    }
    else if (e.key === 'Escape') setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div ref={rootRef} className={cn('relative flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex gap-0.5 text-caption-md text-gray-80">
          {label}
          {required && <span className="text-red-40">*</span>}
        </label>
      )}

      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-invalid={!!error}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border text-left transition-colors',
          triggerSize[size],
          disabled
            ? 'cursor-not-allowed border-gray-30 bg-gray-20 text-gray-60'
            : readOnly
              ? 'cursor-default border-gray-30 bg-gray-10 text-gray-90'
              : cn(
                  'bg-white',
                  error ? 'border-red-40' : open ? 'border-brand-60' : 'border-gray-40 hover:border-brand-30',
                  selected ? 'text-gray-90' : 'text-gray-50',
                ),
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className="flex size-4 shrink-0 items-center justify-center">
          <img
            src={chevronDown}
            width={11.8666}
            height={6.53333}
            alt=""
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </span>
      </button>

      {error && <p className="text-caption-md text-red-40">{error}</p>}

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className={cn(
            'absolute right-0 left-0 z-50 flex max-h-72 flex-col gap-[5px] overflow-y-auto rounded-lg border border-brand-60 bg-white p-2',
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(o)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-lg px-2.5 text-body-md',
                  optionSize[size],
                  o.disabled
                    ? 'cursor-not-allowed text-gray-40'
                    : isSelected || i === active
                      ? 'cursor-pointer bg-brand-10 text-brand-60'
                      : 'cursor-pointer text-gray-90',
                )}
              >
                {isSelected && <img src={checkIcon} width={18} height={18} alt="" className="size-4.5 shrink-0" />}
                <span className="truncate">{o.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

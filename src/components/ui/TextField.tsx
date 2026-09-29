import { useId, type ComponentProps, type ReactNode } from 'react'
import searchIcon from '@/assets/icons/search.svg'
import { cn } from '@/lib/cn'
import { fieldBorder } from './fieldStyles'

type Size = 'lg' | 'sm'

const boxSize: Record<Size, string> = {
  lg: 'h-13 px-4 text-body-lg',
  sm: 'h-[42px] px-3 text-label-md',
}

interface FieldFrameProps {
  id: string
  label?: string
  required?: boolean
  message?: ReactNode
  error?: string
  success?: string
  className?: string
  children: ReactNode
}

/** 입력 컴포넌트 공통: 상단 라벨 + 하단 메시지 */
export function FieldFrame({ id, label, required, message, error, success, className, children }: FieldFrameProps) {
  const note = error ?? success ?? message
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex gap-0.5 text-caption-md text-gray-80">
          {label}
          {required && <span className="text-red-40">*</span>}
        </label>
      )}
      {children}
      {note && (
        <p className={cn('text-caption-md', error ? 'text-red-40' : success ? 'text-green-40' : 'text-gray-80')}>{note}</p>
      )}
    </div>
  )
}

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'size'> {
  size?: Size
  label?: string
  message?: ReactNode
  error?: string
  success?: string
  search?: boolean
  /** 오른쪽에 붙는 단위 등 */
  suffix?: ReactNode
  className?: string
}

export function TextField({
  size = 'lg',
  label,
  required,
  message,
  error,
  success,
  search = false,
  suffix,
  disabled,
  readOnly,
  className,
  id,
  ...props
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <FieldFrame id={inputId} label={label} required={required} message={message} error={error} success={success} className={className}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border transition-colors',
          boxSize[size],
          disabled
            ? 'border-gray-30 bg-gray-20 text-gray-60'
            : readOnly
              ? 'border-gray-30 bg-gray-10 text-gray-90'
              : cn('bg-white text-gray-90', fieldBorder(error, success)),
        )}
      >
        {search && <img src={searchIcon} width={16} height={16} alt="" className="size-4 shrink-0" />}
        <input
          id={inputId}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-50 disabled:cursor-not-allowed"
          {...props}
        />
        {suffix && <span className="shrink-0 text-gray-70">{suffix}</span>}
      </div>
    </FieldFrame>
  )
}

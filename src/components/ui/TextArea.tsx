import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fieldBorder } from './fieldStyles'
import { FieldFrame } from './TextField'

interface TextAreaProps extends ComponentProps<'textarea'> {
  label?: string
  message?: ReactNode
  error?: string
}

export function TextArea({ label, required, message, error, disabled, readOnly, className, id, rows = 3, ...props }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <FieldFrame id={inputId} label={label} required={required} message={message} error={error} className={className}>
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={!!error}
        className={cn(
          'min-h-20 w-full resize-y rounded-lg border px-3 py-2.5 text-body-lg outline-none transition-colors placeholder:text-gray-50',
          disabled
            ? 'cursor-not-allowed border-gray-30 bg-gray-20 text-gray-60'
            : readOnly
              ? 'border-gray-30 bg-gray-10 text-gray-90'
              : cn('bg-white text-gray-90', fieldBorder(error), 'focus:border-brand-60'),
        )}
        {...props}
      />
    </FieldFrame>
  )
}

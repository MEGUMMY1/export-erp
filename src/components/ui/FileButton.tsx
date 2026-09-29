import { useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface FileButtonProps {
  onSelect: (file: File) => void
  accept?: string
  disabled?: boolean
  children: ReactNode
}

/** 파일 선택 버튼 — 기본 파일 입력을 숨기고 Button으로 연다 */
export function FileButton({ onSelect, accept = '.pdf,.jpg,.jpeg,.png', disabled, children }: FileButtonProps) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
          e.target.value = ''
        }}
      />
      <Button variant="outlined" size="sm" disabled={disabled} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  )
}

import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import closeIcon from '../../assets/icons/close.svg'
import { cn } from '../../lib/cn'
import { Button } from './Button'

// Text 타입(가운데 정렬 제목+설명) / Content 타입(좌측 제목+본문), Confirm(취소+확인) / Alert(확인만)
type Size = 'regular' | 'large'

interface ModalAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Text 타입: 가운데 정렬 설명 문구 */
  description?: ReactNode
  /** Content 타입: 본문 영역 (있으면 제목이 좌측 정렬) */
  children?: ReactNode
  size?: Size
  confirm?: ModalAction
  /** 없으면 Alert 타입(확인 버튼만) */
  cancel?: ModalAction
  /** 기본 버튼 구성 대신 직접 구성 (예: 승인/반려) */
  footer?: ReactNode
  showClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'regular',
  confirm,
  cancel,
  footer,
  showClose = false,
}: ModalProps) {
  const titleId = useId()
  const isContent = children != null

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const actions =
    footer ??
    (confirm && (
      <>
        {cancel && (
          <Button variant="text" size="lg" className="flex-1" onClick={cancel.onClick} disabled={cancel.disabled}>
            {cancel.label}
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={confirm.onClick} disabled={confirm.disabled}>
          {confirm.label}
        </Button>
      </>
    ))

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-190 w-full flex-col gap-5 overflow-hidden rounded-xl bg-white shadow-modal',
          size === 'regular' ? 'max-w-105' : 'max-w-130',
          isContent ? 'p-5' : 'px-5 pt-8 pb-5',
        )}
      >
        <h2
          id={titleId}
          className={cn('text-subtitle-lg text-gray-90', isContent ? 'pr-6 text-left' : 'text-center')}
        >
          {title}
        </h2>

        {showClose && (
          <button type="button" onClick={onClose} aria-label="닫기" className="absolute top-5 right-5">
            <img src={closeIcon} width={20} height={20} alt="" className="size-5" />
          </button>
        )}

        {!isContent && description && (
          <div className="flex min-h-15 items-center justify-center p-2.5">
            <p className="text-center text-caption-md text-gray-80">{description}</p>
          </div>
        )}

        {isContent && <div className="min-h-0 overflow-y-auto">{children}</div>}

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}

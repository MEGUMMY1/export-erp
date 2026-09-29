import { useState, type ReactNode } from 'react'
import { Button, Modal, TextArea } from '@/components/ui'

interface Props {
  title: string
  /** 결재 대상 요약 */
  children?: ReactNode
  approveLabel?: string
  rejectLabel?: string
  /** 승인 메모 기본 안내 (반려는 사유 필수) */
  notePlaceholder?: string
  /** 승인할 수 없는 사유 — 있으면 승인 버튼 비활성 (반려는 가능) */
  approveBlockedReason?: string
  onApprove: (note: string) => boolean
  onReject: (note: string) => boolean
  onClose: () => void
}

/** 결재 모달 — 승인/반려, 반려 시 사유 필수 */
export function DecisionModal({
  title,
  children,
  approveLabel = '승인',
  rejectLabel = '반려',
  notePlaceholder = '승인 메모 (선택) / 반려 사유 (필수)',
  approveBlockedReason,
  onApprove,
  onReject,
  onClose,
}: Props) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="large"
      showClose
      footer={
        <>
          <Button
            variant="outlined-red"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (!note.trim()) return setError('반려 사유를 입력해 주세요.')
              if (onReject(note)) onClose()
            }}
          >
            {rejectLabel}
          </Button>
          <Button size="lg" className="flex-1" disabled={!!approveBlockedReason} onClick={() => onApprove(note) && onClose()}>
            {approveLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {children}
        {approveBlockedReason && <p className="text-body-sm text-red-60">{approveBlockedReason}</p>}
        <TextArea
          label="결재 메모"
          placeholder={notePlaceholder}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setError(undefined)
          }}
          error={error}
          message="결재 내용은 차량별 처리 이력에 남습니다."
        />
      </div>
    </Modal>
  )
}

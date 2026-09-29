import { Chip, type ChipTone } from '@/components/ui'
import type { GateResult, Risk } from '@/domain/types'
import { cn } from '@/lib/cn'

const RISK: Record<Risk, { tone: ChipTone; label: string }> = {
  CLEAR: { tone: 'success', label: '정상' },
  REVIEW: { tone: 'warning', label: '보완' },
  BLOCKED: { tone: 'error', label: '차단' },
}

export function RiskChip({ risk }: { risk: Risk }) {
  const r = RISK[risk]
  return <Chip tone={r.tone}>{r.label}</Chip>
}

/** 게이트 제목 — Hard는 빨강, Soft는 주황 텍스트 */
export function GateLabel({ gate, className }: { gate: GateResult; className?: string }) {
  return (
    <p className={cn('text-body-md-m', gate.severity === 'HARD' ? 'text-red-60' : 'text-orange-60', className)}>
      [{gate.code}] {gate.title}
    </p>
  )
}

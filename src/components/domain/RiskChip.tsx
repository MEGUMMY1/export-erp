import type { GateResult, Risk } from '@/domain/types'
import { Chip, type ChipTone } from '@/components/ui'

const RISK: Record<Risk, { tone: ChipTone; label: string }> = {
  CLEAR: { tone: 'success', label: '정상' },
  REVIEW: { tone: 'warning', label: '보완' },
  BLOCKED: { tone: 'error', label: '차단' },
}

export function RiskChip({ risk }: { risk: Risk }) {
  const r = RISK[risk]
  return <Chip tone={r.tone}>{r.label}</Chip>
}

/** 게이트 코드 칩 — Hard는 오류색, Soft는 주의색 */
export function GateChip({ gate }: { gate: GateResult }) {
  return (
    <Chip tone={gate.severity === 'HARD' ? 'error' : 'warning'}>
      {gate.code} {gate.title}
    </Chip>
  )
}

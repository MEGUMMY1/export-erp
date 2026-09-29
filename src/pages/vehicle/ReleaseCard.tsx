import { Field, Panel } from '@/components/domain/Panel'
import { Chip, type ChipTone } from '@/components/ui'
import { GATE_META } from '@/domain/constants'
import { dday, formatDate, formatDateTime, formatKRW } from '@/domain/format'
import { isOverdue } from '@/domain/rules'
import type { ConditionalRelease, ErpData } from '@/domain/types'

function state(r: ConditionalRelease, data: ErpData): { tone: ChipTone; label: string } {
  if (r.status === 'PENDING') return { tone: 'progress', label: '결재 대기' }
  if (r.status === 'REJECTED') return { tone: 'default', label: '반려' }
  if (r.outcome === 'WRITTEN_OFF') return { tone: 'error', label: '불공제 확정' }
  if (r.resolvedAt) return { tone: 'success', label: '보완 완료' }
  if (isOverdue(r, data)) return { tone: 'error', label: `기한 초과 ${dday(r.dueDate)}` }
  return { tone: 'warning', label: `보완 중 ${dday(r.dueDate)}` }
}

/** 조건부 선적 — 누가, 왜, 언제까지 보완하기로 하고 풀어줬는가 */
export function ReleaseCard({ release, data }: { release: ConditionalRelease; data: ErpData }) {
  const userName = (id?: string) => data.users.find((u) => u.id === id)?.name ?? '—'
  const s = state(release, data)
  return (
    <Panel title="조건부 선적" actions={<Chip tone={s.tone}>{s.label}</Chip>}>
      <dl className="flex flex-col gap-3">
        <Field label="보완 항목">{release.gateCodes.map((c) => `${c} ${GATE_META[c].title}`).join(', ')}</Field>
        <Field label="보완 기한 · 책임자">
          {formatDate(release.dueDate)} · {userName(release.ownerId)}
        </Field>
        <Field label="요청">
          {userName(release.requestedBy)} · {formatDateTime(release.requestedAt)}
          <span className="block text-caption-md text-gray-70">{release.reason}</span>
        </Field>
        {release.decidedBy && (
          <Field label={release.status === 'REJECTED' ? '반려' : '승인'}>
            {userName(release.decidedBy)} · {release.decidedAt && formatDateTime(release.decidedAt)}
            {release.decisionNote && <span className="block text-caption-md text-gray-70">{release.decisionNote}</span>}
          </Field>
        )}
        <Field label="결재 당시 증빙 미확보 예상 금액">{formatKRW(release.vatImpact)}</Field>
      </dl>
    </Panel>
  )
}

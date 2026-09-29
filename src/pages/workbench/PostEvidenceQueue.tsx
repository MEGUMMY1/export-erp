import { useNavigate } from 'react-router'
import { Chip, type ChipTone } from '@/components/ui'
import { GATE_META, STAGE_LABEL } from '@/domain/constants'
import { daysFromToday, dday, formatDate, formatKRW } from '@/domain/format'
import { isOverdue, type Evaluation } from '@/domain/rules'
import type { ConditionalRelease, ErpData } from '@/domain/types'

function releaseState(r: ConditionalRelease, data: ErpData, ev: Evaluation | undefined): { tone: ChipTone; label: string } {
  if (r.status === 'PENDING') return { tone: 'progress', label: '결재 대기' }
  if (r.status === 'REJECTED') return { tone: 'default', label: '반려' }
  const open = ev?.gates.some((g) => r.gateCodes.includes(g.code)) ?? false
  if (r.resolvedAt || !open) return { tone: 'success', label: '보완 완료' }
  if (isOverdue(r, data)) return { tone: 'error', label: '기한 초과' }
  return { tone: 'warning', label: '보완 중' }
}

/** 조건부 선적 사후 증빙 추적 — 풀어준 건은 끝까지 따라간다 */
export function PostEvidenceQueue({ rows, data, evals }: { rows: ConditionalRelease[]; data: ErpData; evals: Record<string, Evaluation> }) {
  const navigate = useNavigate()
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? id

  if (!rows.length) return <p className="px-5 py-16 text-center text-body-md text-gray-70">조건부 선적 이력이 없습니다.</p>

  return (
    <table className="w-full text-left">
      <thead className="bg-gray-10 text-label-md text-gray-70">
        <tr className="border-b border-gray-30">
          <th className="px-5 py-3">차량</th>
          <th className="py-3">단계</th>
          <th className="py-3">보완 항목</th>
          <th className="py-3">책임자</th>
          <th className="py-3">보완 기한</th>
          <th className="py-3 text-right">미확보 매입세액</th>
          <th className="py-3 pr-5 text-right">상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const v = data.vehicles[r.vehicleId]
          const ev = evals[r.vehicleId]
          const state = releaseState(r, data, ev)
          const left = daysFromToday(r.dueDate)
          const active = state.label === '보완 중' || state.label === '기한 초과'
          return (
            <tr key={r.id} onClick={() => navigate(`/vehicles/${v.id}`)} className="cursor-pointer border-b border-gray-20 align-top hover:bg-gray-10">
              <td className="px-5 py-3.5">
                <p className="text-body-md-m">{v.plateNumber}</p>
                <p className="text-caption-sm text-gray-70">
                  {v.manufacturer} {v.model}
                </p>
              </td>
              <td className="py-3.5 text-body-sm">{STAGE_LABEL[v.stage]}</td>
              <td className="py-3.5 text-body-sm">{r.gateCodes.map((c) => `${c} ${GATE_META[c].title}`).join(', ')}</td>
              <td className="py-3.5 text-body-sm">{userName(r.ownerId)}</td>
              <td className="py-3.5">
                <p className="text-body-sm">{formatDate(r.dueDate)}</p>
                {active && (
                  <p className={left < 0 ? 'text-caption-md text-red-60' : left <= 2 ? 'text-caption-md text-orange-60' : 'text-caption-md text-gray-70'}>
                    {dday(r.dueDate)}
                  </p>
                )}
              </td>
              <td className="py-3.5 text-right text-body-sm">{active && ev ? formatKRW(ev.vat.unsecured) : '—'}</td>
              <td className="py-3.5 pr-5 text-right">
                <Chip tone={state.tone}>{state.label}</Chip>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

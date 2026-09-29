import { Panel } from '@/components/domain/Panel'
import { Chip } from '@/components/ui'
import { formatDate, formatDateTime } from '@/domain/format'
import type { ErpData, Shipment } from '@/domain/types'
import { cn } from '@/lib/cn'
import { SLIP_STATUS } from './slipStatus'

interface Props {
  slips: Shipment[]
  data: ErpData
  selectedId?: string
  onSelect: (id: string) => void
}

/** 선적 전표 목록 — 행을 누르면 아래에 상세가 열린다 */
export function SlipList({ slips, data, selectedId, onSelect }: Props) {
  const userName = (id?: string) => data.users.find((u) => u.id === id)?.name ?? '—'

  return (
    <Panel title="선적 전표" actions={<span className="text-caption-md text-gray-70">{slips.length}건</span>}>
      {slips.length === 0 ? (
        <p className="text-body-sm text-gray-70">선적 전표가 없습니다.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="border-y border-gray-20 text-label-md text-gray-70">
            <tr>
              <th className="py-2.5">전표번호</th>
              <th className="py-2.5">상태</th>
              <th className="py-2.5">선박 · 항로</th>
              <th className="py-2.5">예정 출항일</th>
              <th className="py-2.5 text-right">차량</th>
              <th className="py-2.5 pl-6">작성 · 결재</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((s) => {
              const status = SLIP_STATUS[s.status]
              const active = s.id === selectedId
              return (
                <tr
                  key={s.id}
                  role="button"
                  aria-pressed={active}
                  onClick={() => onSelect(s.id)}
                  className={cn('border-b border-gray-20 transition-colors', active ? 'bg-brand-10' : 'hover:bg-gray-10')}
                >
                  <td className={cn('py-3 text-body-md-m', active ? 'text-brand-70' : 'text-gray-90')}>{s.slipNo}</td>
                  <td className="py-3">
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </td>
                  <td className="py-3 text-body-sm">
                    {s.vessel} {s.voyage}
                    <span className="block text-caption-sm text-gray-70">
                      {s.departurePort} → {s.arrivalPort}
                    </span>
                  </td>
                  <td className="py-3 text-body-sm">{formatDate(s.scheduledDeparture)}</td>
                  <td className="py-3 text-right text-body-sm">{s.vehicleIds.length}대</td>
                  <td className="py-3 pl-6 text-caption-md text-gray-70">
                    {userName(s.createdBy)} {formatDateTime(s.createdAt)}
                    {s.decidedBy && (
                      <span className="block">
                        {s.status === 'REJECTED' ? '반려' : '결재'} {userName(s.decidedBy)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

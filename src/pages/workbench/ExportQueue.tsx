import { useNavigate } from 'react-router'
import { RiskChip } from '@/components/domain/RiskChip'
import { Checkbox, Chip } from '@/components/ui'
import { PURCHASE_TYPE_LABEL } from '@/domain/constants'
import { formatKRW, formatMoney } from '@/domain/format'
import { canAddToSlip, type Evaluation } from '@/domain/rules'
import type { ErpData, Vehicle } from '@/domain/types'
import { cn } from '@/lib/cn'

interface Props {
  rows: Vehicle[]
  data: ErpData
  evals: Record<string, Evaluation>
  /** 선적 전표를 만들 수 있는 역할(영업)일 때만 선택 체크박스를 보인다 */
  selectable: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (ids: string[], checked: boolean) => void
}

/** 수출 검증 대상 — 차량별 판정과 판정 사유. 행을 누르면 상세에서 해소 액션을 처리한다 */
export function ExportQueue({ rows, data, evals, selectable, selected, onToggle, onToggleAll }: Props) {
  const navigate = useNavigate()
  const eligible = rows.filter((v) => canAddToSlip(v.id, data, evals[v.id]).ok).map((v) => v.id)
  const allChecked = eligible.length > 0 && eligible.every((id) => selected.has(id))

  if (!rows.length) {
    return <p className="px-5 py-16 text-center text-body-md text-gray-70">조건에 맞는 차량이 없습니다.</p>
  }

  return (
    <table className="w-full table-fixed text-left">
      <colgroup>
        {selectable && <col className="w-12" />}
        <col className="w-44" />
        <col className="w-40" />
        <col className="w-36" />
        <col className="w-36" />
        <col />
        <col className="w-40" />
      </colgroup>
      <thead className="sticky top-16 z-10 bg-gray-10 text-label-md text-gray-70">
        <tr className="border-b border-gray-30">
          {selectable && (
            <th className="px-4 py-3">
              {eligible.length > 0 && (
                <Checkbox
                  aria-label="이 페이지의 전표 편입 가능 차량 전체 선택"
                  title="이 페이지의 전표 편입 가능 차량 전체 선택"
                  checked={allChecked}
                  onChange={(e) => onToggleAll(eligible, e.target.checked)}
                />
              )}
            </th>
          )}
          <th className={cn('py-3', !selectable && 'pl-5')}>차량</th>
          <th className="py-3">매입</th>
          <th className="py-3">판매</th>
          <th className="py-3">판정</th>
          <th className="py-3">판정 사유</th>
          <th className="py-3 pr-5 text-right">증빙 미확보 예상 금액</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => {
          const ev = evals[v.id]
          const p = data.purchases[v.id]
          const s = data.sales[v.id]
          const eligibleRow = canAddToSlip(v.id, data, ev).ok
          const top = ev.gates[0]
          return (
            <tr
              key={v.id}
              onClick={() => navigate(`/vehicles/${v.id}`)}
              className={cn('cursor-pointer border-b border-gray-20 align-top hover:bg-gray-10', selectable && selected.has(v.id) && 'bg-brand-10 hover:bg-brand-10')}
            >
              {selectable && (
                <td className="px-4 py-3.5" onClick={(e) => eligibleRow && e.stopPropagation()}>
                  {eligibleRow && (
                    <Checkbox aria-label={`${v.plateNumber} 선택`} checked={selected.has(v.id)} onChange={() => onToggle(v.id)} />
                  )}
                </td>
              )}
              <td className={cn('py-3.5 pr-3', !selectable && 'pl-5')}>
                <p className="text-body-md-m text-gray-90">{v.plateNumber}</p>
                <p className="text-caption-sm text-gray-70">
                  {v.manufacturer} {v.model} · {v.modelYear}
                </p>
                <p className="truncate font-mono text-caption-sm text-gray-50">{v.vin}</p>
              </td>
              <td className="py-3.5 pr-3">
                <p className="text-body-sm text-gray-90">{formatKRW(p.amount)}</p>
                <p className="text-caption-sm text-gray-70">{PURCHASE_TYPE_LABEL[p.purchaseType]}</p>
              </td>
              <td className="py-3.5 pr-3">
                {s && (
                  <>
                    <p className="text-body-sm text-gray-90">{formatMoney(s.amount, s.currency)}</p>
                    <p className="text-caption-sm text-gray-70">{s.exportCountry}</p>
                  </>
                )}
              </td>
              <td className="py-3.5 pr-3">
                <div className="flex flex-col items-start gap-1">
                  <RiskChip risk={ev.risk} />
                  {ev.releaseCovers && <Chip tone="scheduled">조건부 승인</Chip>}
                  {ev.release?.status === 'PENDING' && <Chip tone="progress">결재 대기</Chip>}
                </div>
              </td>
              <td className="py-3.5 pr-3">
                {top ? (
                  <>
                    <p className={cn('text-body-md-m', top.severity === 'HARD' ? 'text-red-60' : 'text-orange-60')}>
                      [{top.code}] {top.title}
                      {ev.gates.length > 1 && <span className="ml-1 text-caption-sm text-gray-70">외 {ev.gates.length - 1}건</span>}
                    </p>
                    <p className="line-clamp-2 text-caption-md text-gray-80">{top.reason}</p>
                  </>
                ) : (
                  <p className="text-body-sm text-gray-50">모든 검증 통과</p>
                )}
              </td>
              <td className={cn('py-3.5 pr-5 text-right text-body-sm', ev.vat.unsecured > 0 ? 'text-orange-60' : 'text-gray-50')}>
                {ev.vat.unsecured > 0 ? formatKRW(ev.vat.unsecured) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

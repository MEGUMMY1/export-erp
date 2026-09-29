import { useNavigate } from 'react-router'
import { RiskChip } from '@/components/domain/RiskChip'
import { Chip } from '@/components/ui'
import { PURCHASE_TYPE_LABEL, STAGE_LABEL } from '@/domain/constants'
import { formatDate, formatKRW } from '@/domain/format'
import { canConfirmPurchase, type Evaluation } from '@/domain/rules'
import type { ErpData, Vehicle } from '@/domain/types'
import { cn } from '@/lib/cn'

/** 매입 진행 중 차량 — 매입 확정 전에 걸러야 할 항목 */
export function PurchaseQueue({ rows, data, evals }: { rows: Vehicle[]; data: ErpData; evals: Record<string, Evaluation> }) {
  const navigate = useNavigate()

  if (!rows.length) return <p className="px-5 py-16 text-center text-body-md text-gray-70">매입 진행 중인 차량이 없습니다.</p>

  return (
    <table className="w-full text-left">
      <thead className="bg-gray-10 text-label-md text-gray-70">
        <tr className="border-b border-gray-30">
          <th className="px-5 py-3">차량</th>
          <th className="py-3">매입처</th>
          <th className="py-3">매입</th>
          <th className="py-3">단계</th>
          <th className="py-3">판정</th>
          <th className="py-3 pr-5">매입 확정 조건</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => {
          const ev = evals[v.id]
          const p = data.purchases[v.id]
          const guard = canConfirmPurchase(v.id, data, ev)
          const confirmed = v.stage === 'PURCHASE_CONFIRMED'
          return (
            <tr key={v.id} onClick={() => navigate(`/vehicles/${v.id}`)} className="cursor-pointer border-b border-gray-20 align-top hover:bg-gray-10">
              <td className="px-5 py-3.5">
                <p className="text-body-md-m">{v.plateNumber}</p>
                <p className="text-caption-sm text-gray-70">
                  {v.manufacturer} {v.model} · {v.modelYear}
                </p>
              </td>
              <td className="py-3.5 text-body-sm">{data.vendors[p.vendorId]?.name}</td>
              <td className="py-3.5">
                <p className="text-body-sm">{formatKRW(p.amount)}</p>
                <p className="text-caption-sm text-gray-70">
                  {PURCHASE_TYPE_LABEL[p.purchaseType]} · {formatDate(p.purchaseDate)}
                </p>
              </td>
              <td className="py-3.5">
                <Chip tone={confirmed ? 'scheduled' : 'waiting'}>{STAGE_LABEL[v.stage]}</Chip>
              </td>
              <td className="py-3.5">
                <RiskChip risk={ev.risk} />
              </td>
              <td className="py-3.5 pr-5">
                {confirmed ? (
                  <p className="text-body-sm text-gray-70">확정 완료 · 판매 등록 대기</p>
                ) : guard.ok ? (
                  <p className="text-body-sm text-green-60">확정 가능</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {guard.reasons.map((r) => (
                      <li key={r} className={cn('text-body-sm', 'text-red-60')}>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

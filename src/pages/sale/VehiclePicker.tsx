import { RiskChip } from '@/components/domain/RiskChip'
import { PURCHASE_TYPE_LABEL } from '@/domain/constants'
import { formatDate, formatKRW } from '@/domain/format'
import type { Evaluation } from '@/domain/rules'
import type { ErpData, Vehicle } from '@/domain/types'
import { cn } from '@/lib/cn'

interface Props {
  vehicles: Vehicle[]
  data: ErpData
  evals: Record<string, Evaluation>
  selectedId: string | null
  onSelect: (id: string) => void
}

/** 매입 확정 차량만 판매 대상 — 고르면 차량·매입 정보가 자동으로 연결된다 */
export function VehiclePicker({ vehicles, data, evals, selectedId, onSelect }: Props) {
  if (!vehicles.length) return <p className="text-body-md text-gray-70">판매 등록할 매입 확정 차량이 없습니다.</p>

  return (
    <table className="w-full text-left">
      <thead className="border-y border-gray-20 text-label-md text-gray-70">
        <tr>
          <th className="py-2.5">차량</th>
          <th className="py-2.5">VIN</th>
          <th className="py-2.5">매입</th>
          <th className="py-2.5">매입처</th>
          <th className="py-2.5 text-right">판정</th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((v) => {
          const p = data.purchases[v.id]
          const active = v.id === selectedId
          return (
            <tr
              key={v.id}
              role="button"
              aria-pressed={active}
              onClick={() => onSelect(v.id)}
              className={cn('border-b border-gray-20 transition-colors', active ? 'bg-brand-10' : 'hover:bg-gray-10')}
            >
              <td className="py-3">
                <p className={cn('text-body-md-m', active ? 'text-brand-70' : 'text-gray-90')}>{v.plateNumber}</p>
                <p className="text-caption-sm text-gray-70">
                  {v.manufacturer} {v.model} · {v.modelYear}
                </p>
              </td>
              <td className="py-3 font-mono text-caption-md text-gray-70">{v.vin}</td>
              <td className="py-3">
                <p className="text-body-sm">{formatKRW(p.amount)}</p>
                <p className="text-caption-sm text-gray-70">
                  {PURCHASE_TYPE_LABEL[p.purchaseType]} · {formatDate(p.purchaseDate)}
                </p>
              </td>
              <td className="py-3 text-body-sm">{data.vendors[p.vendorId]?.name}</td>
              <td className="py-3 text-right">
                <RiskChip risk={evals[v.id].risk} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

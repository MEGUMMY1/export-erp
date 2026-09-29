import { Field, Panel } from '@/components/domain/Panel'
import { Chip } from '@/components/ui'
import { formatDate, formatKRW, formatMoney, formatNumber } from '@/domain/format'
import type { ErpData } from '@/domain/types'
import { cn } from '@/lib/cn'

/** 판매·수출 — 매입 데이터와 연결된 판매 정보, 수출신고필증 대조 */
export function SalePanel({ vehicleId, data }: { vehicleId: string; data: ErpData }) {
  const v = data.vehicles[vehicleId]
  const p = data.purchases[vehicleId]
  const s = data.sales[vehicleId]
  const decl = data.exportDecls[vehicleId]
  if (!s) return null

  const buyer = data.buyers[s.buyerId]
  const saleKrw = s.amount * s.exchangeRate
  const margin = saleKrw - p.amount
  const rows = decl
    ? [
        { label: 'VIN', erp: v.vin, doc: decl.extracted.vin },
        { label: '차량번호', erp: v.plateNumber, doc: decl.extracted.plateNumber },
      ]
    : []

  return (
    <Panel title="판매 · 수출">
      <dl className="grid grid-cols-4 gap-4">
        <Field label="바이어">
          {buyer.name}
          <span className="block text-caption-sm text-gray-70">
            {buyer.country} · {buyer.port}
          </span>
        </Field>
        <Field label="판매가">
          {formatMoney(s.amount, s.currency)}
          <span className="block text-caption-sm text-gray-70">
            {formatKRW(saleKrw)} (환율 {formatNumber(s.exchangeRate)} 고정)
          </span>
        </Field>
        <Field label="예상 손익">
          <span className={margin < 0 ? 'text-red-60' : 'text-green-60'}>{formatKRW(margin)}</span>
        </Field>
        <Field label="매출 처리">{s.taxTreatment === 'ZERO_RATED' ? '영세율 (직수출)' : '국내 과세 (10%)'}</Field>
        <Field label="Incoterms">{s.incoterms}</Field>
        <Field label="관세사">{s.customsBroker ?? <span className="text-orange-60">미지정</span>}</Field>
        <Field label="예정 선적일">{s.expectedShipmentDate ? formatDate(s.expectedShipmentDate) : <span className="text-orange-60">미정</span>}</Field>
        <Field label="판매번호">{s.salesNo}</Field>
      </dl>

      <div className="flex flex-col gap-2 border-t border-gray-20 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-body-md-m">수출신고필증 대조 (AI 문서 추출)</p>
          {decl && <Chip tone={decl.status === 'ACCEPTED' ? 'success' : 'warning'}>{decl.declNo} · {decl.status === 'ACCEPTED' ? '수리' : '신고 · 미수리'}</Chip>}
        </div>
        {decl ? (
          <table className="w-full text-left text-body-sm">
            <thead className="text-label-md text-gray-70">
              <tr className="border-b border-gray-20">
                <th className="py-2">항목</th>
                <th className="py-2">ERP</th>
                <th className="py-2">신고필증</th>
                <th className="py-2 text-right">결과</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((r) => {
                const same = r.erp === r.doc
                return (
                  <tr key={r.label} className="border-b border-gray-20 last:border-0">
                    <td className="py-2 font-sans">{r.label}</td>
                    <td className="py-2">{r.erp}</td>
                    <td className={cn('py-2', !same && 'text-red-60')}>{r.doc}</td>
                    <td className="py-2 text-right font-sans">
                      <Chip tone={same ? 'success' : 'error'}>{same ? '일치' : '불일치'}</Chip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-body-sm text-gray-70">수출신고 전입니다.</p>
        )}
        <p className="text-caption-md text-gray-70">AI는 문서에서 값을 추출해 대조만 합니다. 판정과 정정은 담당자가 합니다.</p>
      </div>
    </Panel>
  )
}

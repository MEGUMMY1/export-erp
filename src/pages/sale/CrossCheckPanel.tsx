import { Panel } from '@/components/domain/Panel'
import { GateLabel, RiskChip } from '@/components/domain/RiskChip'
import { formatKRW } from '@/domain/format'
import type { GateResult, Purchase, Risk, TaxTreatment } from '@/domain/types'
import { inputVat, type VatSummary } from '@/domain/vat'
import { cn } from '@/lib/cn'

interface Props {
  purchase?: Purchase
  saleKrw: number
  taxTreatment: TaxTreatment
  vat?: VatSummary
  gates: GateResult[]
  risk?: Risk
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body-sm text-gray-70">{label}</span>
      <span
        className={cn(
          'text-body-md-m',
          tone === 'good' && 'text-green-60',
          tone === 'bad' && 'text-red-60',
          tone === 'warn' && 'text-orange-60',
          !tone && 'text-gray-90',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** 매입·매출 크로스체크 — 손익, 매입 증빙 ↔ 매출 처리, 부가세 영향 */
export function CrossCheckPanel({ purchase, saleKrw, taxTreatment, vat, gates, risk }: Props) {
  if (!purchase || !vat) {
    return (
      <Panel title="매입·매출 크로스체크">
        <p className="text-body-sm text-gray-50">판매할 차량을 선택하면 매입 데이터와 대조합니다.</p>
      </Panel>
    )
  }

  const margin = saleKrw - purchase.amount
  const marginRate = purchase.amount ? (margin / purchase.amount) * 100 : 0
  const zeroRated = taxTreatment === 'ZERO_RATED'

  return (
    <Panel title="매입·매출 크로스체크" actions={risk && <RiskChip risk={risk} />}>
      <section className="flex flex-col gap-2">
        <p className="text-caption-md text-gray-70">손익</p>
        <Row label="매입가" value={formatKRW(purchase.amount)} />
        <Row label="판매가 (원화 환산)" value={saleKrw ? formatKRW(saleKrw) : '—'} />
        <Row
          label="예상 손익"
          value={saleKrw ? `${formatKRW(margin)} (${marginRate.toFixed(1)}%)` : '—'}
          tone={!saleKrw ? undefined : margin < 0 ? 'bad' : 'good'}
        />
      </section>

      <section className="flex flex-col gap-2 border-t border-gray-20 pt-4">
        <p className="text-caption-md text-gray-70">부가세 — 매입 증빙 ↔ 매출 처리</p>
        <Row label="매출 처리" value={zeroRated ? '영세율 (직수출, 매출세액 0)' : '국내 과세 (10%)'} tone={zeroRated ? undefined : 'warn'} />
        {!zeroRated && saleKrw > 0 && <Row label="매출세액 발생" value={formatKRW(inputVat(saleKrw))} tone="warn" />}
        <Row label="매입세액 공제 대상" value={formatKRW(vat.expected)} />
        <Row label="확보 (검증 완료)" value={formatKRW(vat.secured)} tone="good" />
        <Row label="미확보" value={formatKRW(vat.unsecured)} tone={vat.unsecured > 0 ? 'warn' : undefined} />
        <p className="text-caption-md text-gray-70">
          {zeroRated
            ? '영세율 수출은 매출세액이 없어, 매입 증빙으로 확보한 매입세액이 그대로 환급됩니다.'
            : '국내 판매로 처리하면 영세율 대상에서 제외되어 매출세액이 발생합니다.'}
        </p>
      </section>

      <section className="flex flex-col gap-2 border-t border-gray-20 pt-4">
        <p className="text-caption-md text-gray-70">등록 후 판정 {gates.length > 0 && `· ${gates.length}건`}</p>
        {gates.length === 0 ? (
          <p className="text-body-sm text-green-60">걸리는 항목이 없습니다. 등록 즉시 선적 전표에 담을 수 있습니다.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {gates.map((g) => (
              <li key={g.code} className="flex flex-col gap-1">
                <GateLabel gate={g} />
                <p className="text-body-sm text-gray-80">{g.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Panel>
  )
}

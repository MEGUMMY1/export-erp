import circleCheck from '@/assets/icons/circle-check.svg'
import circleClose from '@/assets/icons/circle-close.svg'
import circlePending from '@/assets/icons/circle-exclamation-neutral.svg'
import triangle from '@/assets/icons/triangle-exclamation.svg'
import { Panel } from '@/components/domain/Panel'
import { RiskChip } from '@/components/domain/RiskChip'
import { formatKRW } from '@/domain/format'
import type { GateCode, GateResult, Purchase, Risk, TaxTreatment } from '@/domain/types'
import { inputVat, type VatSummary } from '@/domain/vat'
import { cn } from '@/lib/cn'

type Status = 'ok' | 'warn' | 'error' | 'pending'

interface CheckItem {
  key: string
  status: Status
  title: string
  result: string
  note?: string
}

const ICON: Record<Status, string> = { ok: circleCheck, warn: triangle, error: circleClose, pending: circlePending }
const RESULT_COLOR: Record<Status, string> = {
  ok: 'text-green-60',
  warn: 'text-orange-60',
  error: 'text-red-60',
  pending: 'text-gray-50',
}

/** 체크리스트가 직접 다루는 게이트 — 나머지는 '그 밖의 판정'으로 표시 */
const COVERED: GateCode[] = ['S1', 'S2', 'S3', 'S5', 'S6', 'S8']

interface Props {
  purchase?: Purchase
  saleKrw: number
  taxTreatment: TaxTreatment
  vat?: VatSummary
  gates: GateResult[]
  risk?: Risk
}

/** 매입·매출 크로스체크 — 계산 과정 대신 결론(손익·부가세 환급·통관)을 먼저 보여준다 */
export function CrossCheckPanel({ purchase, saleKrw, taxTreatment, vat, gates, risk }: Props) {
  if (!purchase || !vat) {
    return (
      <Panel title="매입·매출 크로스체크">
        <p className="text-body-sm text-gray-50">판매할 차량을 선택하면 매입 데이터와 대조합니다.</p>
      </Panel>
    )
  }

  const margin = saleKrw - purchase.amount
  const rate = purchase.amount ? (margin / purchase.amount) * 100 : 0
  const has = (code: GateCode) => gates.some((g) => g.code === code)

  const items: CheckItem[] = [
    !saleKrw
      ? { key: 'margin', status: 'pending', title: '손익', result: '판매가 입력 대기' }
      : margin < 0
        ? { key: 'margin', status: 'warn', title: '손익', result: `역마진 ${formatKRW(margin)} (${rate.toFixed(1)}%)`, note: '결재 시 사유가 필요합니다.' }
        : { key: 'margin', status: 'ok', title: '손익', result: `+${formatKRW(margin)} (${rate.toFixed(1)}%)` },

    taxTreatment === 'DOMESTIC' && vat.unsecured > 0
      ? {
          // 원문의 "현금으로 매입해 놓고 계산서 매출로 잡아 버리는" 경우
          key: 'vat',
          status: 'error',
          title: '부가세 — 매입 증빙 ↔ 매출 처리 불일치',
          result: `이중 손실: 매입세액 ${formatKRW(vat.unsecured)} 공제 불가 + 매출세액 ${saleKrw ? formatKRW(inputVat(saleKrw)) : '—'} 발생`,
          note: `${purchase.paymentMethod === 'CASH' ? '현금 매입' : '증빙 없는 매입'}을 과세 매출로 처리하면 부가세를 내기만 하고 돌려받지 못합니다.`,
        }
      : taxTreatment === 'DOMESTIC'
      ? {
          key: 'vat',
          status: 'warn',
          title: '부가세',
          result: `국내 판매 — 매출세액 ${saleKrw ? formatKRW(inputVat(saleKrw)) : ''} 발생`,
          note: '영세율(수출) 대상에서 제외됩니다.',
        }
      : vat.unsecured > 0
        ? {
            key: 'vat',
            status: 'warn',
            title: '부가세 환급',
            result: `${formatKRW(vat.unsecured)} 환급 불가`,
            note: has('S1') || has('S2') || has('S3') ? '매입 증빙이 없거나 검증 전입니다.' : '매입 증빙을 확인해 주세요.',
          }
        : { key: 'vat', status: 'ok', title: '부가세 환급', result: `매입세액 ${formatKRW(vat.expected)} 전액 환급 가능` },

    has('S6')
      ? { key: 'customs', status: 'warn', title: '통관 정보', result: '관세사·예정 선적일 미입력', note: '선적 전까지 보완하면 됩니다.' }
      : { key: 'customs', status: 'ok', title: '통관 정보', result: '입력 완료' },

    ...gates
      .filter((g) => !COVERED.includes(g.code))
      .map<CheckItem>((g) => ({
        key: g.code,
        status: g.severity === 'HARD' ? 'error' : 'warn',
        title: `[${g.code}] ${g.title}`,
        result: g.severity === 'HARD' ? '선적 차단' : '보완 필요',
        note: g.reason,
      })),
  ]

  return (
    <Panel title="매입·매출 크로스체크" actions={risk && <RiskChip risk={risk} />}>
      <ul className="divide-y divide-gray-20">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <img src={ICON[item.status]} width={20} height={20} alt="" className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-caption-md text-gray-70">{item.title}</p>
              <p className={cn('text-body-md-m', RESULT_COLOR[item.status])}>{item.result}</p>
              {item.note && <p className="text-caption-md text-gray-70">{item.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

import { CheckList, type CheckItem } from '@/components/domain/CheckList'
import { Panel } from '@/components/domain/Panel'
import { RiskChip } from '@/components/domain/RiskChip'
import { formatKRW } from '@/domain/format'
import type { GateCode, GateResult, Purchase, Risk, TaxTreatment } from '@/domain/types'
import { inputVat, type VatSummary } from '@/domain/vat'

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

/**
 * 매입·매출 크로스체크 — 계산 과정 대신 결론을 먼저 보여준다.
 * 경제적 손익(역마진) / 매입 증빙(세무) / 거래 유형(매출 처리)을 서로 다른 항목으로 나눈다.
 */
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
  // 영세율이면 확보한 매입세액만큼 원가가 줄어든다 — 증빙 확보 여부에 따른 손익을 나란히 보여준다
  const zeroRated = taxTreatment === 'ZERO_RATED'
  const marginSecured = saleKrw - (purchase.amount - vat.expected)
  const marginNow = saleKrw - (purchase.amount - vat.secured)
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${formatKRW(n)}`
  const costNote = '부대비용(탁송·말소·통관·운임) 제외'

  const items: CheckItem[] = [
    !saleKrw
      ? { key: 'margin', status: 'pending', title: '손익', result: '판매가 입력 대기' }
      : margin < 0
        ? {
            key: 'margin',
            status: 'warn',
            title: '손익',
            result: `역마진 ${formatKRW(margin)} (${rate.toFixed(1)}%)`,
            note: `매입가 기준입니다.${zeroRated ? ` 증빙 확보 시 ${signed(marginSecured)}.` : ''} 결재 시 사유가 필요합니다.`,
          }
        : zeroRated && vat.unsecured > 0
          ? {
              key: 'margin',
              status: 'ok',
              title: '손익',
              result: `증빙 확보 시 ${signed(marginSecured)} · 미확보 시 ${signed(marginNow)}`,
              note: `증빙을 확보해야 매입세액만큼 이익이 늘어납니다. ${costNote}`,
            }
          : zeroRated
            ? { key: 'margin', status: 'ok', title: '손익', result: signed(marginSecured), note: `매입세액 환급 반영 · ${costNote}` }
            : { key: 'margin', status: 'ok', title: '손익', result: `${signed(margin)} (${rate.toFixed(1)}%)`, note: costNote },

    taxTreatment === 'DOMESTIC' && vat.unsecured > 0
      ? {
          // 원문의 "현금으로 매입해 놓고 계산서 매출로 잡아 버리는" 경우 — [S8]은 보완 항목이므로 차단 색(빨강)을 쓰지 않는다
          key: 'vat',
          status: 'warn',
          title: '거래 유형 · 부가세 이중 손실',
          result: `증빙 미확보 예상 금액 ${formatKRW(vat.unsecured)}`,
          note: `${purchase.paymentMethod === 'CASH' ? '현금 매입' : '증빙 없는 매입'}인데 국내 과세 매출이라 매출세액${saleKrw ? ` ${formatKRW(inputVat(saleKrw))}` : ''}까지 발생합니다. 회계 팀장 확인 전에는 진행할 수 없습니다.`,
        }
      : taxTreatment === 'DOMESTIC'
      ? {
          key: 'vat',
          status: 'warn',
          title: '거래 유형',
          result: saleKrw ? `국내 판매 — 매출세액 ${formatKRW(inputVat(saleKrw))} 발생` : '국내 판매 — 매출세액 발생',
          note: '영세율(수출) 대상에서 제외됩니다.',
        }
      : vat.unsecured > 0
        ? {
            key: 'vat',
            status: 'warn',
            title: '매입 증빙',
            result: `증빙 미확보 예상 금액 ${formatKRW(vat.unsecured)}`,
            note: has('S1') || has('S2') || has('S3') ? '매입 증빙이 없거나 검증 전입니다.' : '매입 증빙을 확인해 주세요.',
          }
        : { key: 'vat', status: 'ok', title: '매입 증빙', result: '공제 요건 증빙 확보 (회계 검증 완료)' },

    taxTreatment === 'DOMESTIC'
      ? { key: 'customs', status: 'ok', title: '통관 정보', result: '국내 판매 — 해당 없음', note: '선적 대상이 아니며, 회계 확인 후 종결됩니다.' }
      : has('S6')
        ? { key: 'customs', status: 'warn', title: '통관 정보', result: '예정 선적일 미입력', note: '선적 전까지 보완하면 됩니다.' }
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
      <CheckList items={items} />
    </Panel>
  )
}

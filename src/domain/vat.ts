import type { Evidence, Policy, Purchase } from './types'

export interface VatSummary {
  /** 증빙이 갖춰지면 공제받을 수 있는 매입세액 */
  expected: number
  /** 검증 완료된 증빙 기준으로 확보된 매입세액 */
  secured: number
  unsecured: number
  /** 증빙은 모두 제출됐고 회계 검증만 남은 상태 */
  pendingVerification: boolean
  basis: string
}

/** 부가세 포함 금액에서 매입세액(10/110) */
export const inputVat = (amount: number) => Math.round((amount * 10) / 110)

/**
 * 수출(영세율) 매출은 매출세액이 0이므로 매입세액 공제·환급이 곧 이익이다.
 * 증빙이 없으면 그 매입세액을 돌려받지 못한다 → 차량별 '증빙 미확보 예상 금액'으로 표시.
 * 산정 방식과 공제 요건은 회사 정책값(Policy.vatEvidence)으로 두고, 세법 요건은 세무 자문으로 확정한다.
 */
export function calcVat(purchase: Purchase, evidences: Evidence[], policy: Policy): VatSummary {
  const expected = inputVat(purchase.amount)
  const need = policy.vatEvidence[purchase.purchaseType]
  const live = evidences.filter((e) => e.status !== 'REJECTED')
  const verified = (kind: string) => live.some((e) => e.kind === kind && e.status === 'VERIFIED')
  const submitted = (kind: string) => live.some((e) => e.kind === kind)

  let secured = 0
  if (purchase.purchaseType === 'INDIVIDUAL') {
    const ok = need.every(verified) && purchase.paymentMethod === 'BANK_TRANSFER'
    secured = ok ? expected : 0
  } else {
    // 세금계산서 금액만큼만 공제된다 (금액 불일치 시 차액은 미확보)
    const invoice = live.find((e) => e.kind === 'TAX_INVOICE' && e.status === 'VERIFIED')
    secured = invoice ? Math.min(inputVat(invoice.amount ?? 0), expected) : 0
  }

  return {
    expected,
    secured,
    unsecured: expected - secured,
    pendingVerification: secured < expected && need.every(submitted),
    basis:
      purchase.purchaseType === 'INDIVIDUAL'
        ? '개인 매입 · 중고자동차 매입세액 공제 특례 기준 (회사 정책값)'
        : '세금계산서 매입세액 기준 (회사 정책값)',
  }
}

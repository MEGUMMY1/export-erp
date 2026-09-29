/**
 * 금액 입력 유틸 — 입력 중 천 단위 구분자(,)를 붙이고, 허용 소수 자릿수를 제한한다.
 * 통화마다 소수 자릿수가 다르므로(KRW 0, USD·EUR 2) decimals로 받는다.
 */

/** 입력 문자열 → 표시용 문자열. 예) ('1234567.891', 2) → '1,234,567.89' */
export function formatAmountInput(raw: string, decimals = 0): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [intRaw = '', ...rest] = cleaned.split('.')
  const int = intRaw.replace(/^0+(?=\d)/, '')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (decimals === 0 || rest.length === 0) return grouped
  // 소수점은 첫 번째만 인정, 자릿수 제한 (입력 중 '12.'도 유지)
  const fraction = rest.join('').slice(0, decimals)
  return `${grouped || '0'}.${fraction}`
}

/** 표시용 문자열 → 숫자. 비어 있으면 null */
export function parseAmount(text: string): number | null {
  const n = Number(text.replace(/,/g, ''))
  return text.trim() === '' || Number.isNaN(n) ? null : n
}

/** 숫자 → 표시용 문자열 (값 → 입력창 초기값) */
export function toAmountText(value: number | null | undefined, decimals = 0): string {
  if (value == null) return ''
  return formatAmountInput(decimals ? value.toFixed(decimals).replace(/\.?0+$/, '') : String(Math.round(value)), decimals)
}

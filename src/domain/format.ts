import { TODAY } from './constants'
import type { Currency } from './types'

const krw = new Intl.NumberFormat('ko-KR')

/** ₩1,234 / -₩1,234 (부호는 통화 기호 앞) */
export const formatKRW = (n: number) => `${n < 0 ? '-' : ''}₩${krw.format(Math.abs(Math.round(n)))}`

export const formatMoney = (n: number, currency: Currency) =>
  currency === 'KRW' ? formatKRW(n) : `${currency} ${krw.format(n)}`

export const formatNumber = (n: number) => krw.format(n)

/** 'YYYY-MM-DDTHH:mm' 또는 'YYYY-MM-DD' → 'MM.DD' / 'MM.DD HH:mm' */
export const formatDate = (s: string) => s.slice(5, 10).replace('-', '.')
export const formatDateTime = (s: string) => (s.length > 10 ? `${formatDate(s)} ${s.slice(11, 16)}` : formatDate(s))

const toDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`)

/** from → to 사이 일수 (to가 뒤면 양수) */
export const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000)

export const daysFromToday = (date: string) => daysBetween(TODAY, date)

/** D-3 / D-day / D+2 */
export const dday = (date: string) => {
  const d = daysFromToday(date)
  return d === 0 ? 'D-day' : d > 0 ? `D-${d}` : `D+${-d}`
}

export const addDays = (date: string, days: number) => {
  const d = toDate(date)
  d.setDate(d.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** 데모 기준일 + 현재 시각 */
export const nowStamp = () => {
  const now = new Date()
  return `${TODAY}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

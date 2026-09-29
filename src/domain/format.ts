import { TODAY } from './constants'
import type { Currency } from './types'

const krw = new Intl.NumberFormat('ko-KR')

/** ₩1,234 / -₩1,234 (부호는 통화 기호 앞) */
export const formatKRW = (n: number) => `${n < 0 ? '-' : ''}₩${krw.format(Math.abs(Math.round(n)))}`

export const formatMoney = (n: number, currency: Currency) =>
  currency === 'KRW' ? formatKRW(n) : `${currency} ${krw.format(n)}`

export const formatNumber = (n: number) => krw.format(n)

/** 'YYYY-MM-DDTHH:mm' 또는 'YYYY-MM-DD' → 'YYYY.MM.DD' / 'YYYY.MM.DD HH:mm' */
export const formatDate = (s: string) => s.slice(0, 10).replaceAll('-', '.')
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

/** 방금 전 / n분 전 / n시간 전 / n일 전 (7일 이상은 yyyy.mm.dd) — 기준: 데모 기준일 + 현재 시각 */
export const formatRelative = (s: string) => {
  const toTime = (v: string) => new Date(v.length > 10 ? v : `${v}T00:00`).getTime()
  const minutes = Math.floor((toTime(nowStamp()) - toTime(s)) / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}일 전` : formatDate(s)
}

/** 데모 기준일 + 현재 시각 */
export const nowStamp = () => {
  const now = new Date()
  return `${TODAY}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

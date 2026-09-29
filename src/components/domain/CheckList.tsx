import circleCheck from '@/assets/icons/circle-check.svg'
import circleClose from '@/assets/icons/circle-close.svg'
import circlePending from '@/assets/icons/circle-exclamation-neutral.svg'
import triangle from '@/assets/icons/triangle-exclamation.svg'
import { cn } from '@/lib/cn'

export type CheckStatus = 'ok' | 'warn' | 'error' | 'pending'

export interface CheckItem {
  key: string
  status: CheckStatus
  title: string
  result: string
  note?: string
}

const ICON: Record<CheckStatus, string> = { ok: circleCheck, warn: triangle, error: circleClose, pending: circlePending }

const RESULT_COLOR: Record<CheckStatus, string> = {
  ok: 'text-green-60',
  warn: 'text-orange-60',
  error: 'text-red-60',
  pending: 'text-gray-50',
}

const VERDICT_STYLE: Record<CheckStatus, string> = {
  ok: 'border-green-30 bg-green-10 text-green-60',
  warn: 'border-orange-30 bg-orange-10 text-orange-60',
  error: 'border-red-30 bg-red-10 text-red-60',
  pending: 'border-gray-30 bg-gray-10 text-gray-70',
}

/** 결론 한 줄 — "그래서 진행할 수 있는가" */
export function Verdict({ status, title, note }: { status: CheckStatus; title: string; note?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border px-4 py-3', VERDICT_STYLE[status])}>
      <img src={ICON[status]} width={20} height={20} alt="" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-body-md-m">{title}</p>
        {note && <p className="text-caption-md text-gray-80">{note}</p>}
      </div>
    </div>
  )
}

/** 항목별 점검 결과 — 아이콘 + 결론 한 줄 + 짧은 설명 */
export function CheckList({ items }: { items: CheckItem[] }) {
  return (
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
  )
}

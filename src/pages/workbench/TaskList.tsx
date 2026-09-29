import { useNavigate } from 'react-router'
import circleCheck from '@/assets/icons/circle-check.svg'
import circleClose from '@/assets/icons/circle-close.svg'
import circleInfo from '@/assets/icons/circle-exclamation-info.svg'
import chevronRight from '@/assets/icons/chevron-right.svg'
import triangle from '@/assets/icons/triangle-exclamation.svg'
import type { Task, TaskTone } from '@/domain/tasks'
import type { User } from '@/domain/types'

const TONE_ICON: Record<TaskTone, string> = {
  error: circleClose,
  warning: triangle,
  success: circleCheck,
  info: circleInfo,
}

/** 역할별 할 일 — 누르면 해당 업무 화면(필터 적용)으로 이동 */
export function TaskList({ tasks, user }: { tasks: Task[]; user: User }) {
  const navigate = useNavigate()

  return (
    <section className="rounded-xl border border-gray-30 bg-white">
      <header className="flex items-center justify-between border-b border-gray-30 px-5 py-3.5">
        <h2 className="text-subtitle-md text-gray-90">내 할 일</h2>
        <span className="text-caption-md text-gray-70">
          {user.name} {user.title} · {tasks.length}건
        </span>
      </header>
      {tasks.length === 0 ? (
        <p className="px-5 py-6 text-body-md text-gray-70">지금 처리할 업무가 없습니다.</p>
      ) : (
        // 1px 간격 + 배경색으로 구분선을 그려, 개수가 홀수여도 선이 끊기지 않게 한다
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-gray-20">
          {tasks.length % 2 === 1 && <li aria-hidden className="order-last bg-white" />}
          {tasks.map((t) => (
            <li key={t.id} className="bg-white">
              <button
                type="button"
                onClick={() => navigate(t.to)}
                className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-10"
              >
                <img src={TONE_ICON[t.tone]} width={20} height={20} alt="" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md-m text-gray-90">{t.title}</span>
                  <span className="block truncate text-caption-md text-gray-70">{t.description}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-label-md text-brand-70">
                  {t.actionLabel}
                  <img src={chevronRight} width={24} height={24} alt="" className="size-4 opacity-60 group-hover:opacity-100" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

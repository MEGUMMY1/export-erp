import { STAGES, STAGE_LABEL, stageIndex } from '@/domain/constants'
import type { Stage } from '@/domain/types'
import { cn } from '@/lib/cn'

/** 진행 단계 — 선적 완료 후 보완 항목이 남아 있으면 '사후 보완 중' */
export function StageStepper({ stage, postEvidence }: { stage: Stage; postEvidence: boolean }) {
  const current = stageIndex(stage)
  return (
    <ol className="flex items-start">
      {STAGES.map((s, i) => {
        const done = i < current || (s === 'CLOSED' && stage === 'CLOSED')
        const active = i === current && stage !== 'CLOSED'
        const label = s === 'SHIPPED' && active && postEvidence ? '사후 보완 중' : STAGE_LABEL[s]
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : i <= current ? 'bg-brand-60' : 'bg-gray-30')} />
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-label-sm',
                  done && 'bg-brand-60 text-white',
                  active && (postEvidence ? 'bg-orange-60 text-white ring-4 ring-orange-10' : 'bg-brand-70 text-white ring-4 ring-brand-20'),
                  !done && !active && 'border border-gray-40 bg-white text-gray-50',
                )}
              >
                {i + 1}
              </span>
              <span className={cn('h-0.5 flex-1', i === STAGES.length - 1 ? 'bg-transparent' : i < current ? 'bg-brand-60' : 'bg-gray-30')} />
            </div>
            <span className={cn('text-caption-md', active ? (postEvidence ? 'text-orange-60' : 'text-brand-70') : done ? 'text-gray-90' : 'text-gray-50')}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

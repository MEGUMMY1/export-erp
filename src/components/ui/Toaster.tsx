import circleCheck from '../../assets/icons/circle-check.svg'
import circleClose from '../../assets/icons/circle-close.svg'
import circleExclamationInfo from '../../assets/icons/circle-exclamation-info.svg'
import circleExclamationNeutral from '../../assets/icons/circle-exclamation-neutral.svg'
import triangleExclamation from '../../assets/icons/triangle-exclamation.svg'
import { cn } from '../../lib/cn'
import { useToastStore, type ToastType } from './toast'

const typeStyle: Record<ToastType, { className: string; icon: string }> = {
  success: { className: 'border-green-60 text-green-60', icon: circleCheck },
  warning: { className: 'border-orange-60 text-orange-60', icon: triangleExclamation },
  error: { className: 'border-red-60 text-red-60', icon: circleClose },
  info: { className: 'border-blue-60 text-blue-60', icon: circleExclamationInfo },
  neutral: { className: 'border-gray-90 text-gray-90', icon: circleExclamationNeutral },
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div aria-live="polite" className="pointer-events-none fixed top-6 left-1/2 z-60 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const style = typeStyle[t.type]
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex min-w-50 items-center gap-2 rounded-lg border-l-3 bg-white px-3 py-2 shadow-toast',
              style.className,
            )}
          >
            <img src={style.icon} width={20} height={20} alt="" className="size-5 shrink-0" />
            <p className="text-label-xl">{t.message}</p>
          </div>
        )
      })}
    </div>
  )
}

import { cn } from '@/lib/cn'

const SIDES = ['전면', '후면', '좌측', '우측']

/** 외관 사진 칸 (시연용: 누르면 업로드된 것으로 처리) */
export function PhotoSlots({ count, onChange }: { count: number; onChange: (count: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {SIDES.map((side, i) => (
          <button
            key={side}
            type="button"
            onClick={() => onChange(Math.max(count, i + 1))}
            className={cn(
              'flex aspect-4/3 items-center justify-center rounded-lg text-caption-md',
              i < count ? 'bg-brand-10 text-brand-70' : 'border border-dashed border-gray-40 text-gray-50 hover:bg-gray-10',
            )}
          >
            {i < count ? `${side} ✓` : `+ ${side}`}
          </button>
        ))}
      </div>
      <p className="text-caption-sm text-gray-50">시연용: 칸을 누르면 사진이 올라간 것으로 처리됩니다.</p>
    </div>
  )
}

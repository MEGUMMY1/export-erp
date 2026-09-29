import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { usePageTitle } from '@/components/layout/pageTitle'
import { Tabs } from '@/components/ui'
import type { ShipmentStatus } from '@/domain/types'
import { useCurrentUser, useData, useEvaluations } from '@/store'
import { ReleaseApprovals } from './ReleaseApprovals'
import { SlipDetail } from './SlipDetail'
import { SlipList } from './SlipList'

type Tab = 'slips' | 'releases'

// 처리할 일이 있는 전표가 위로
const STATUS_ORDER: ShipmentStatus[] = ['PENDING', 'APPROVED', 'SHIPPED', 'REJECTED']

export function ShipmentsPage() {
  usePageTitle('선적 승인', '정상 차량은 선적 전표 단위로 일괄 승인하고, 예외만 개별 결재합니다.')
  const data = useData()
  const evals = useEvaluations()
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()

  const tab = (params.get('tab') as Tab) ?? 'slips'
  const slips = Object.values(data.shipments).sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.createdAt.localeCompare(a.createdAt),
  )
  const selected = data.shipments[params.get('id') ?? ''] ?? slips[0]
  const pendingReleases = data.releases.filter((r) => r.status === 'PENDING').length

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  // 처음 선택된 전표를 URL에 고정 — 결재·선적으로 목록 순서가 바뀌어도 보던 전표가 유지되도록
  const selectedId = selected?.id
  const hasIdParam = params.has('id')
  useEffect(() => {
    if (!hasIdParam && selectedId) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('id', selectedId)
          return next
        },
        { replace: true },
      )
    }
  }, [hasIdParam, selectedId, setParams])

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onChange={(v) => set({ tab: v === 'slips' ? null : v })}
        items={[
          { value: 'slips', label: '선적 전표', count: slips.length },
          { value: 'releases', label: '조건부 선적 결재', count: pendingReleases },
        ]}
      />

      {tab === 'slips' ? (
        <div className="flex flex-col gap-5">
          <SlipList slips={slips} data={data} selectedId={selected?.id} onSelect={(id) => set({ id })} />
          {selected && <SlipDetail key={selected.id} slip={selected} data={data} evals={evals} role={user.role} />}
        </div>
      ) : (
        <ReleaseApprovals data={data} evals={evals} role={user.role} />
      )}
    </div>
  )
}

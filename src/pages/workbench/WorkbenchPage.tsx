import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { usePageTitle } from '../../components/layout/pageTitle'
import { Button, Dropdown, Pagination, Tabs, TextField } from '../../components/ui'
import { GATE_META, stageIndex } from '../../domain/constants'
import { formatKRW } from '../../domain/format'
import { can, canAddToSlip, permissionHint } from '../../domain/rules'
import { tasksFor } from '../../domain/tasks'
import type { GateCode, Risk, Vehicle } from '../../domain/types'
import { useCurrentUser, useData, useEvaluations } from '../../store'
import { CreateSlipModal } from './CreateSlipModal'
import { ExportQueue } from './ExportQueue'
import { FilterChip } from './FilterChip'
import { PostEvidenceQueue } from './PostEvidenceQueue'
import { PurchaseQueue } from './PurchaseQueue'
import { ReleaseRequestModal } from './ReleaseRequestModal'
import { TaskList } from './TaskList'

type Tab = 'export' | 'purchase' | 'post'
type RiskFilter = 'ALL' | Risk | 'READY'

const PAGE_SIZE = 20
const RISK_ORDER: Risk[] = ['BLOCKED', 'REVIEW', 'CLEAR']
const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'BLOCKED', label: '차단' },
  { value: 'REVIEW', label: '보완' },
  { value: 'CLEAR', label: '정상' },
  { value: 'READY', label: '전표 편입 가능' },
]

export function WorkbenchPage() {
  usePageTitle('검증 작업 큐', '시스템이 모든 차량을 먼저 검증합니다. 사람은 걸러진 차량만 확인하면 됩니다.')
  const data = useData()
  const evals = useEvaluations()
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null)
  const [slipOpen, setSlipOpen] = useState(false)

  const tab = (params.get('tab') as Tab) ?? 'export'
  const risk = (params.get('risk') as RiskFilter) ?? 'ALL'
  const gate = (params.get('gate') as GateCode | null) ?? null
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? 1)

  /** 필터가 바뀌면 1페이지로 */
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const tasks = useMemo(() => tasksFor(user, data, evals), [user, data, evals])
  const vehicles = Object.values(data.vehicles)

  const matches = (v: Vehicle) => {
    if (gate && !evals[v.id].gates.some((g) => g.code === gate)) return false
    if (!q) return true
    const text = `${v.plateNumber} ${v.vin} ${v.manufacturer} ${v.model}`.toLowerCase()
    return text.includes(q.toLowerCase())
  }

  const exportBase = vehicles.filter((v) => v.stage === 'SALE_REGISTERED' && matches(v))
  const isReady = (v: Vehicle) => canAddToSlip(v.id, data, evals[v.id]).ok
  const riskCount = (f: RiskFilter) =>
    f === 'ALL' ? exportBase.length : f === 'READY' ? exportBase.filter(isReady).length : exportBase.filter((v) => evals[v.id].risk === f).length

  const exportRows = exportBase
    .filter((v) => (risk === 'ALL' ? true : risk === 'READY' ? isReady(v) : evals[v.id].risk === risk))
    .sort((a, b) => {
      const ra = RISK_ORDER.indexOf(evals[a.id].risk)
      const rb = RISK_ORDER.indexOf(evals[b.id].risk)
      return ra !== rb ? ra - rb : evals[b.id].vat.unsecured - evals[a.id].vat.unsecured
    })
  const purchaseRows = vehicles.filter((v) => stageIndex(v.stage) < stageIndex('SALE_REGISTERED') && matches(v))
  const releaseRows = data.releases.filter((r) => r.status !== 'REJECTED').sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const total = tab === 'export' ? exportRows.length : tab === 'purchase' ? purchaseRows.length : releaseRows.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const slice = <T,>(rows: T[]) => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const gateOptions = useMemo(() => {
    const codes = new Set(Object.values(evals).flatMap((e) => e.gates.map((g) => g.code)))
    return [...codes].sort().map((c) => ({ value: c, label: `${c} ${GATE_META[c].title}` }))
  }, [evals])

  const selectedIds = [...selected].filter((id) => data.vehicles[id]?.stage === 'SALE_REGISTERED' && isReady(data.vehicles[id]))
  const selectedVat = selectedIds.reduce((sum, id) => sum + (evals[id].releaseCovers ? evals[id].vat.unsecured : 0), 0)
  const canSlip = can(user.role, 'CREATE_SLIP')

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = (ids: string[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })

  return (
    <div className="flex flex-col gap-6 pb-20">
      <TaskList tasks={tasks} user={user} />

      <section className="rounded-xl border border-gray-30 bg-white">
        <Tabs
          className="px-3"
          value={tab}
          onChange={(v) => setParam('tab', v === 'export' ? null : v)}
          items={[
            { value: 'export', label: '수출 검증', count: vehicles.filter((v) => v.stage === 'SALE_REGISTERED').length },
            { value: 'purchase', label: '매입 진행', count: vehicles.filter((v) => stageIndex(v.stage) < stageIndex('SALE_REGISTERED')).length },
            { value: 'post', label: '조건부 선적 · 사후 증빙', count: releaseRows.length },
          ]}
        />

        {tab !== 'post' && (
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-30 px-5 py-4">
            {tab === 'export' &&
              RISK_FILTERS.map((f) => (
                <FilterChip key={f.value} selected={risk === f.value} onClick={() => setParam('risk', f.value === 'ALL' ? null : f.value)}>
                  {f.label} <span className="text-gray-50">{riskCount(f.value)}</span>
                </FilterChip>
              ))}
            <div className="ml-auto flex items-center gap-2">
              <Dropdown
                size="sm"
                className="w-56"
                placeholder="게이트 전체"
                value={gate}
                onChange={(v) => setParam('gate', v === 'ALL' ? null : v)}
                options={[{ value: 'ALL', label: '게이트 전체' }, ...gateOptions]}
              />
              <TextField
                size="sm"
                search
                className="w-64"
                placeholder="차량번호 · VIN · 모델"
                value={q}
                onChange={(e) => setParam('q', e.target.value || null)}
              />
            </div>
          </div>
        )}

        {tab === 'export' && (
          <ExportQueue
            rows={slice(exportRows)}
            data={data}
            evals={evals}
            userId={user.id}
            canRequest={can(user.role, 'REQUEST_RELEASE')}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onRequestRelease={setReleaseTarget}
          />
        )}
        {tab === 'purchase' && <PurchaseQueue rows={slice(purchaseRows)} data={data} evals={evals} />}
        {tab === 'post' && <PostEvidenceQueue rows={slice(releaseRows)} data={data} evals={evals} />}

        {total > 0 && (
          <footer className="relative flex items-center justify-center px-5 py-4">
            <span className="absolute left-5 text-caption-md text-gray-70">
              총 {total}건 · {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, total)}
            </span>
            <Pagination page={current} pageCount={pageCount} onChange={(p) => setParam('page', p === 1 ? null : String(p))} />
          </footer>
        )}
      </section>

      {tab === 'export' && selectedIds.length > 0 && (
        <div className="fixed right-0 bottom-0 left-65 z-30 border-t border-gray-30 bg-white px-8 py-4 shadow-toast">
          <div className="flex items-center justify-between gap-4">
            <p className="text-body-md">
              <b className="text-subtitle-md">{selectedIds.length}대</b> 선택
              {selectedVat > 0 && <span className="ml-2 text-orange-60">· 조건부 승인 미확보 매입세액 {formatKRW(selectedVat)}</span>}
            </p>
            <div className="flex items-center gap-3">
              {!canSlip && <span className="text-caption-md text-gray-70">{permissionHint('CREATE_SLIP')}</span>}
              <Button variant="outlined-gray" onClick={() => setSelected(new Set())}>
                선택 해제
              </Button>
              <Button disabled={!canSlip} onClick={() => setSlipOpen(true)}>
                선적 전표 만들기
              </Button>
            </div>
          </div>
        </div>
      )}

      {releaseTarget && <ReleaseRequestModal key={releaseTarget} vehicleId={releaseTarget} onClose={() => setReleaseTarget(null)} />}
      {slipOpen && (
        <CreateSlipModal
          vehicleIds={selectedIds}
          onClose={() => setSlipOpen(false)}
          onCreated={() => {
            setSlipOpen(false)
            setSelected(new Set())
          }}
        />
      )}
    </div>
  )
}

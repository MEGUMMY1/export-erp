import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DecisionModal } from '@/components/domain/DecisionModal'
import { Panel } from '@/components/domain/Panel'
import { Button, Chip, Modal, toast } from '@/components/ui'
import { dday, formatDate, formatDateTime, formatKRW, formatMoney } from '@/domain/format'
import { can, type Evaluation } from '@/domain/rules'
import type { ErpData, Role, Shipment } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useErpStore } from '@/store'
import { SLIP_STATUS } from './slipStatus'

interface Props {
  slip: Shipment
  data: ErpData
  evals: Record<string, Evaluation>
  role: Role
}

interface ProcessResult {
  shipped: string[]
  excluded: { vehicleId: string; reasons: string[] }[]
}

type CheckTone = 'ok' | 'warn' | 'error' | 'muted'

const CHECK_COLOR: Record<CheckTone, string> = {
  ok: 'text-green-60',
  warn: 'text-orange-60',
  error: 'text-red-60',
  muted: 'text-gray-70',
}

/** 선적 전표 — 정상 차량 일괄 결재, 승인 후에만 선적 처리 */
export function SlipDetail({ slip, data, evals, role }: Props) {
  const navigate = useNavigate()
  const decideSlip = useErpStore((s) => s.decideSlip)
  const processShipment = useErpStore((s) => s.processShipment)
  const [deciding, setDeciding] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)

  const status = SLIP_STATUS[slip.status]
  const userName = (id?: string) => data.users.find((u) => u.id === id)?.name ?? '—'
  const plate = (id: string) => data.vehicles[id]?.plateNumber ?? id
  const excludedMap = new Map((slip.excluded ?? []).map((e) => [e.vehicleId, e.reasons]))

  // 차량별 선적 전 점검 — 한 열로 결론만
  const rows = slip.vehicleIds.map((id) => {
    const ev = evals[id]
    const hard = ev.gates.filter((g) => g.severity === 'HARD')
    const excluded = excludedMap.get(id)
    let check: { tone: CheckTone; label: string }
    if (excluded) check = { tone: 'error', label: `선적 제외 · ${excluded[0].split(' — ')[0]}` }
    else if (slip.status === 'SHIPPED')
      check = { tone: 'muted', label: data.vehicles[id].stage === 'SHIPPED' ? '선적 완료 · 사후 보완 중' : '선적 완료' }
    else if (hard.length) check = { tone: 'error', label: `차단 · [${hard[0].code}] ${hard[0].title}` }
    else if (ev.releaseCovers && ev.release)
      check = { tone: 'warn', label: `조건부 · 보완 기한 ${formatDate(ev.release.dueDate)} (${dday(ev.release.dueDate)})` }
    else check = { tone: 'ok', label: '정상' }
    return { id, ev, check }
  })
  const count = (tone: CheckTone) => rows.filter((r) => r.check.tone === tone).length
  const conditionalVat = rows.filter((r) => r.check.tone === 'warn').reduce((sum, r) => sum + r.ev.vat.unsecured, 0)

  const canDecide = can(role, 'DECIDE_SLIP')
  const canShip = can(role, 'PROCESS_SHIPMENT')

  const approve = (note: string) => {
    const r = decideSlip(slip.id, true, note)
    if (r.ok) toast.success(`${slip.slipNo} 결재 승인`)
    else toast.error(r.reasons[0])
    return r.ok
  }
  const reject = (note: string) => {
    const r = decideSlip(slip.id, false, note)
    if (r.ok) toast.warning(`${slip.slipNo} 반려 완료 · 차량은 수출 검증으로 돌아갑니다`)
    else toast.error(r.reasons[0])
    return r.ok
  }
  const process = () => {
    const r = processShipment(slip.id)
    if (!r.ok) return toast.error(r.reasons[0])
    setResult({ shipped: r.shipped ?? [], excluded: r.excluded ?? [] })
  }

  // 상태별 주요 행동과 안내
  const action =
    slip.status === 'PENDING'
      ? {
          button: (
            <Button size="sm" disabled={!canDecide} onClick={() => setDeciding(true)}>
              결재하기
            </Button>
          ),
          hint: canDecide ? '정상 차량은 전표 단위로 일괄 승인됩니다.' : '회계 팀장 결재 대기 · 결재 승인 전에는 선적 처리할 수 없습니다.',
        }
      : slip.status === 'APPROVED'
        ? {
            button: (
              <Button size="sm" disabled={!canShip} onClick={process}>
                선적 처리
              </Button>
            ),
            hint: canShip ? '선적 직전 VIN을 다시 조회하고, 차단 항목이 있는 차량은 자동으로 제외합니다.' : '물류 담당 선적 처리 대기',
          }
        : null

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title={
          <span className="flex items-center gap-2">
            {slip.slipNo}
            <Chip tone={status.tone}>{status.label}</Chip>
          </span>
        }
        actions={action?.button}
      >
        <div className="flex flex-col gap-1">
          <p className="text-body-md text-gray-90">
            {slip.vessel} {slip.voyage} · {slip.departurePort} → {slip.arrivalPort} · 출항 {formatDate(slip.scheduledDeparture)} · {slip.container}
          </p>
          <p className="text-caption-md text-gray-70">
            작성 {userName(slip.createdBy)} {formatDateTime(slip.createdAt)}
            {slip.decidedBy && ` · ${slip.status === 'REJECTED' ? '반려' : '결재'} ${userName(slip.decidedBy)} ${slip.decidedAt ? formatDateTime(slip.decidedAt) : ''}`}
            {slip.shippedAt && ` · 선적 처리 ${formatDateTime(slip.shippedAt)}`}
          </p>
          {slip.rejectReason && <p className="text-caption-md text-red-60">반려 사유 · {slip.rejectReason}</p>}
        </div>
        {action && <p className="rounded-lg bg-gray-10 px-4 py-2.5 text-caption-md text-gray-80">{action.hint}</p>}
      </Panel>

      <Panel
        title={`차량 ${rows.length}대`}
        actions={
          <span className="text-caption-md text-gray-70">
            {slip.status === 'SHIPPED' ? (
              <>
                선적 {rows.length - (slip.excluded?.length ?? 0)} · <span className="text-red-60">제외 {slip.excluded?.length ?? 0}</span>
              </>
            ) : (
              <>
                <span className="text-green-60">정상 {count('ok')}</span> · <span className="text-orange-60">조건부 {count('warn')}</span>
                {conditionalVat > 0 && ` (${formatKRW(conditionalVat)})`} · <span className="text-red-60">차단 {count('error')}</span>
              </>
            )}
          </span>
        }
      >
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-52" />
            <col className="w-48" />
            <col className="w-36" />
            <col />
          </colgroup>
          <thead className="border-y border-gray-20 text-label-md text-gray-70">
            <tr>
              <th className="py-2.5">차량</th>
              <th className="py-2.5">바이어</th>
              <th className="py-2.5">판매가</th>
              <th className="py-2.5">선적 전 점검</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, check }) => {
              const v = data.vehicles[id]
              const s = data.sales[id]
              return (
                <tr key={id} onClick={() => navigate(`/vehicles/${id}`)} className="cursor-pointer border-b border-gray-20 align-top hover:bg-gray-10">
                  <td className="py-3 pr-3">
                    <p className="text-body-md-m">{v.plateNumber}</p>
                    <p className="truncate font-mono text-caption-sm text-gray-50">{v.vin}</p>
                  </td>
                  <td className="py-3 pr-3 text-body-sm">
                    <p className="truncate">{data.buyers[s?.buyerId]?.name}</p>
                    <p className="text-caption-sm text-gray-70">{s?.exportCountry}</p>
                  </td>
                  <td className="py-3 pr-3 text-body-sm">{s && formatMoney(s.amount, s.currency)}</td>
                  <td className={cn('py-3 text-body-md-m', CHECK_COLOR[check.tone])}>{check.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>

      {deciding && (
        <DecisionModal title={`${slip.slipNo} 결재`} onApprove={approve} onReject={reject} onClose={() => setDeciding(false)}>
          <div className="flex flex-col gap-1 rounded-lg bg-gray-10 px-4 py-3 text-body-sm">
            <p>
              정상 <b>{count('ok')}대</b>를 전표 단위로 일괄 승인합니다.
            </p>
            {count('warn') > 0 && (
              <p className="text-orange-60">
                조건부 승인 {count('warn')}대 포함 · 증빙 미확보 예상 금액 {formatKRW(conditionalVat)} (기한 내 보완 추적)
              </p>
            )}
            {count('error') > 0 && <p className="text-red-60">현재 차단 {count('error')}대는 선적 처리 시 자동으로 제외됩니다.</p>}
          </div>
        </DecisionModal>
      )}

      {result && (
        <Modal open onClose={() => setResult(null)} title="선적 처리 결과" size="large" confirm={{ label: '확인', onClick: () => setResult(null) }}>
          <div className="flex flex-col gap-4">
            <p className="text-body-md">
              <b className="text-green-60">{result.shipped.length}대 선적 완료</b>
              {result.excluded.length > 0 && <b className="ml-2 text-red-60">· {result.excluded.length}대 제외</b>}
            </p>
            {result.excluded.length > 0 && (
              <ul className="flex flex-col gap-3">
                {result.excluded.map((e) => (
                  <li key={e.vehicleId} className="rounded-lg border border-red-30 bg-red-10 px-4 py-3">
                    <p className="text-body-md-m text-red-60">{plate(e.vehicleId)}</p>
                    {e.reasons.map((r) => (
                      <p key={r} className="text-body-sm text-gray-80">
                        {r}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-caption-md text-gray-70">제외된 차량은 수출 검증 단계로 돌아가 업무 현황에서 추적됩니다.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

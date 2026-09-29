import { useState } from 'react'
import { Link } from 'react-router'
import { DecisionModal } from '@/components/domain/DecisionModal'
import { Field, Panel } from '@/components/domain/Panel'
import { GateLabel } from '@/components/domain/RiskChip'
import { Button, Chip, toast } from '@/components/ui'
import { GATE_META } from '@/domain/constants'
import { dday, formatDate, formatDateTime, formatKRW } from '@/domain/format'
import { can, isOpenRelease, isOverdue, permissionHint, type Evaluation } from '@/domain/rules'
import type { ConditionalRelease, ErpData, Role } from '@/domain/types'
import { useErpStore } from '@/store'

interface Props {
  data: ErpData
  evals: Record<string, Evaluation>
  role: Role
}

/** 조건부 선적 결재 — 무엇을, 언제까지, 누가, 얼마짜리 리스크인지 보고 결정한다 */
export function ReleaseApprovals({ data, evals, role }: Props) {
  const decideRelease = useErpStore((s) => s.decideRelease)
  const [target, setTarget] = useState<ConditionalRelease | null>(null)
  const pending = data.releases.filter((r) => r.status === 'PENDING')
  const decided = data.releases.filter((r) => r.status !== 'PENDING').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const userName = (id?: string) => data.users.find((u) => u.id === id)?.name ?? '—'
  const canDecide = can(role, 'DECIDE_RELEASE')

  /** 요청자의 조건부 선적 이행 이력 */
  const track = (ownerId: string) => {
    const mine = data.releases.filter((r) => r.ownerId === ownerId)
    return { open: mine.filter(isOpenRelease).length, overdue: mine.filter((r) => isOverdue(r, data)).length }
  }

  const decide = (approve: boolean) => (note: string) => {
    if (!target) return false
    const r = decideRelease(target.id, approve, note)
    if (r.ok) toast.success(approve ? '조건부 선적을 승인했습니다' : '조건부 선적을 반려했습니다')
    else toast.error(r.reasons[0])
    return r.ok
  }

  return (
    <div className="flex flex-col gap-5">
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-40 px-5 py-10 text-center text-body-md text-gray-70">결재 대기 중인 조건부 선적이 없습니다.</p>
      ) : (
        pending.map((r) => {
          const v = data.vehicles[r.vehicleId]
          const gates = evals[r.vehicleId]?.gates.filter((g) => r.gateCodes.includes(g.code)) ?? []
          const t = track(r.ownerId)
          return (
            <Panel
              key={r.id}
              title={
                <Link to={`/vehicles/${v.id}`} className="hover:underline">
                  {v.plateNumber} · {v.manufacturer} {v.model}
                </Link>
              }
              actions={
                <>
                  {!canDecide && <span className="text-caption-md text-gray-70">{permissionHint('DECIDE_RELEASE')}</span>}
                  <Button size="sm" disabled={!canDecide} onClick={() => setTarget(r)}>
                    결재하기
                  </Button>
                </>
              }
            >
              <dl className="grid grid-cols-4 gap-4">
                <Field label="미확보 매입세액">
                  <span className={r.vatImpact > 0 ? 'text-orange-60' : undefined}>{formatKRW(r.vatImpact)}</span>
                </Field>
                <Field label="보완 기한">
                  {formatDate(r.dueDate)} <span className="text-caption-md text-gray-70">({dday(r.dueDate)})</span>
                </Field>
                <Field label="요청 · 책임자">
                  {userName(r.requestedBy)} · {formatDateTime(r.requestedAt)}
                </Field>
                <Field label="책임자 이행 이력">
                  <span className={t.overdue ? 'text-red-60' : undefined}>
                    미해소 {t.open}건 · 기한 초과 {t.overdue}건
                  </span>
                </Field>
              </dl>
              <div className="flex flex-col gap-3 border-t border-gray-20 pt-4">
                {gates.length ? (
                  gates.map((g) => (
                    <div key={g.code}>
                      <GateLabel gate={g} />
                      <p className="text-body-sm text-gray-80">{g.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-gray-70">{r.gateCodes.map((c) => `${c} ${GATE_META[c].title}`).join(', ')} (현재 해소됨)</p>
                )}
                <p className="text-body-sm text-gray-80">
                  <span className="text-gray-70">요청 사유 · </span>
                  {r.reason}
                </p>
              </div>
            </Panel>
          )
        })
      )}

      <Panel title="결재 이력" actions={<span className="text-caption-md text-gray-70">{decided.length}건</span>}>
        <table className="w-full text-left">
          <thead className="border-y border-gray-20 text-label-md text-gray-70">
            <tr>
              <th className="py-2.5">차량</th>
              <th className="py-2.5">보완 항목</th>
              <th className="py-2.5">책임자</th>
              <th className="py-2.5">결재</th>
              <th className="py-2.5">메모</th>
            </tr>
          </thead>
          <tbody>
            {decided.map((r) => (
              <tr key={r.id} className="border-b border-gray-20 align-top">
                <td className="py-3 text-body-md-m">
                  <Link to={`/vehicles/${r.vehicleId}`} className="hover:underline">
                    {data.vehicles[r.vehicleId]?.plateNumber}
                  </Link>
                </td>
                <td className="py-3 text-body-sm">{r.gateCodes.map((c) => `${c} ${GATE_META[c].title}`).join(', ')}</td>
                <td className="py-3 text-body-sm">{userName(r.ownerId)}</td>
                <td className="py-3">
                  <Chip tone={r.status === 'APPROVED' ? 'success' : 'default'}>{r.status === 'APPROVED' ? '승인' : '반려'}</Chip>
                  <span className="block text-caption-sm text-gray-50">
                    {userName(r.decidedBy)} · {r.decidedAt && formatDateTime(r.decidedAt)}
                  </span>
                </td>
                <td className="py-3 text-body-sm text-gray-80">{r.decisionNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {target && (
        <DecisionModal
          title="조건부 선적 결재"
          notePlaceholder={`승인 메모 (비우면 '보완 기한 ${formatDate(target.dueDate)} 엄수') / 반려 사유 (필수)`}
          onApprove={decide(true)}
          onReject={decide(false)}
          onClose={() => setTarget(null)}
        >
          <div className="flex flex-col gap-1 rounded-lg bg-gray-10 px-4 py-3 text-body-sm">
            <p>
              <b>{data.vehicles[target.vehicleId].plateNumber}</b> · 보완 기한 {formatDate(target.dueDate)} · 책임자 {userName(target.ownerId)}
            </p>
            <p className="text-orange-60">미확보 매입세액 {formatKRW(target.vatImpact)}</p>
            <p className="text-gray-70">승인하면 보완 전이라도 선적 전표에 담을 수 있고, 기한을 넘기면 책임자의 신규 조건부 요청이 제한됩니다.</p>
          </div>
        </DecisionModal>
      )}
    </div>
  )
}

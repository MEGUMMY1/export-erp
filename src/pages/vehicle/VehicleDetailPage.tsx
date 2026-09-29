import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePageTitle } from '@/components/layout/pageTitle'
import { ReleaseRequestModal } from '@/components/domain/ReleaseRequestModal'
import { RiskChip } from '@/components/domain/RiskChip'
import { Button, Chip, toast } from '@/components/ui'
import { formatKRW, formatNumber } from '@/domain/format'
import { evaluateGates } from '@/domain/gates'
import { can, canConfirmPurchase, canRequestRelease, permissionHint } from '@/domain/rules'
import type { EvidenceKind, GateResult } from '@/domain/types'
import { useCurrentUser, useData, useErpStore, useEvaluations } from '@/store'
import { AuditTrail } from './AuditTrail'
import { EvidencePanel } from './EvidencePanel'
import { GatePanel, type GateActionKind } from './GatePanel'
import { ReleaseCard } from './ReleaseCard'
import { SalePanel } from './SalePanel'
import { StageStepper } from './StageStepper'
import { VatPanel } from './VatPanel'
import { AcknowledgeModal, EvidenceUploadModal, FixSaleModal, HandoverModal } from './VehicleModals'

type ModalState =
  | { type: 'handover' }
  | { type: 'upload'; kind: EvidenceKind }
  | { type: 'acknowledge'; gate: GateResult }
  | { type: 'fixSale' }
  | { type: 'release' }
  | null

export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const data = useData()
  const evals = useEvaluations()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const store = useErpStore()
  const [modal, setModal] = useState<ModalState>(null)

  const v = data.vehicles[id]
  usePageTitle(v ? `${v.plateNumber} · ${v.manufacturer} ${v.model}` : '차량 상세', v ? `VIN ${v.vin}` : undefined)

  if (!v) {
    return (
      <p className="rounded-xl border border-gray-30 bg-white p-10 text-center text-body-md text-gray-70">
        차량을 찾을 수 없습니다. <Link to="/workbench" className="text-brand-70 underline">업무 현황으로</Link>
      </p>
    )
  }

  const ev = evals[id]
  const p = data.purchases[id]
  const hasSoft = ev.gates.some((g) => g.severity === 'SOFT')
  const postEvidence = v.stage === 'SHIPPED' && hasSoft
  const confirmGuard = canConfirmPurchase(id, data, ev)
  const releaseGuard = canRequestRelease(id, user.id, data, ev)
  const shipment = v.shipmentId ? data.shipments[v.shipmentId] : undefined

  const missingKind = (): EvidenceKind => {
    const kinds = data.policy.requiredEvidence[p.purchaseType]
    const has = (k: EvidenceKind) => data.evidences.some((e) => e.vehicleId === id && e.kind === k && e.status !== 'REJECTED')
    return kinds.find((k) => !has(k)) ?? kinds[0]
  }

  const recheck = () => {
    const result = store.recheckVin(id)
    if (!result.ok) return toast.error(result.reasons[0])
    const after = evaluateGates(id, useErpStore.getState().data)
    const hit = after.find((g) => g.code === 'H1' || g.code === 'H2')
    if (hit) toast.error(`재조회 결과: ${hit.title}`)
    else toast.success('VIN 재조회 결과 이상 없음')
  }

  const run = (result: { ok: boolean; reasons: string[] }, message: string) =>
    result.ok ? toast.success(message) : toast.error(result.reasons[0])

  const onGateAction = (kind: GateActionKind, gate: GateResult) => {
    if (kind === 'UPLOAD') setModal({ type: 'upload', kind: gate.code === 'H5' ? 'ID_COPY' : missingKind() })
    else if (kind === 'VERIFY') document.getElementById('evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (kind === 'RECHECK') recheck()
    else if (kind === 'HANDOVER') setModal({ type: 'handover' })
    else if (kind === 'CORRECT_DECL') run(store.correctDeclaration(id), '신고필증 정정본으로 재대조했습니다')
    else if (kind === 'ACCEPT_DECL') run(store.acceptDeclaration(id), '수출신고 수리를 확인했습니다')
    else if (kind === 'ACKNOWLEDGE') setModal({ type: 'acknowledge', gate })
    else if (kind === 'FIX_SALE') setModal({ type: 'fixSale' })
    else if (kind === 'RELEASE') setModal({ type: 'release' })
  }

  // 압류·저당·도난 차량은 해제 확인(재조회) 전 인수 불가
  const vinBlocked = !!v.vinCheck && (v.vinCheck.theft || v.vinCheck.seizure || v.vinCheck.lien)
  const handoverBlocked = !vinBlocked ? undefined : v.vinCheck?.theft ? '도난 차량 — 인수 불가' : '압류·저당 해제 후 인수 가능'
  const blockedActions = handoverBlocked ? { HANDOVER: handoverBlocked } : undefined

  // 단계별 주요 행동
  const primary = (() => {
    if (v.stage === 'PURCHASE_REGISTERED' || v.stage === 'HANDED_OVER') {
      const allowed = can(user.role, 'CONFIRM_PURCHASE')
      return (
        <>
          {v.stage === 'PURCHASE_REGISTERED' && (
            <Button variant="outlined" disabled={!can(user.role, 'HANDOVER') || vinBlocked} onClick={() => setModal({ type: 'handover' })}>
              인수 처리
            </Button>
          )}
          <Button disabled={!allowed || !confirmGuard.ok} onClick={() => run(store.confirmPurchase(id), '매입을 확정했습니다')}>
            매입 확정
          </Button>
          {v.stage === 'PURCHASE_REGISTERED' && handoverBlocked && <Hint danger>{handoverBlocked}</Hint>}
          {!allowed && <Hint>{permissionHint('CONFIRM_PURCHASE')}</Hint>}
          {allowed && !confirmGuard.ok && <Hint danger>{`확정 차단: ${confirmGuard.reasons.join(', ')}`}</Hint>}
        </>
      )
    }
    if (v.stage === 'PURCHASE_CONFIRMED') {
      return (
        <Button disabled={!can(user.role, 'REGISTER_SALE')} onClick={() => navigate(`/sales/new?vehicleId=${id}`)}>
          판매 등록
        </Button>
      )
    }
    if (v.stage === 'SALE_REGISTERED' && hasSoft && can(user.role, 'REQUEST_RELEASE')) {
      return (
        <>
          <Button variant="outlined" disabled={!releaseGuard.ok} onClick={() => setModal({ type: 'release' })}>
            조건부 선적 요청
          </Button>
          {!releaseGuard.ok && <Hint>{releaseGuard.reasons[0]}</Hint>}
        </>
      )
    }
    if (shipment) {
      return (
        <Button variant="outlined" onClick={() => navigate(`/shipments?id=${shipment.id}`)}>
          선적 전표 {shipment.slipNo}
        </Button>
      )
    }
    return null
  })()

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-gray-30 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <RiskChip risk={ev.risk} />
            {ev.releaseCovers && <Chip tone="scheduled">조건부 승인</Chip>}
            {ev.release?.status === 'PENDING' && <Chip tone="progress">조건부 결재 대기</Chip>}
            <span className="text-body-sm text-gray-70">
              {v.modelYear}년식 · {formatNumber(v.mileage)}km · 매입 {formatKRW(p.amount)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">{primary}</div>
        </div>
        <div className="mt-6">
          <StageStepper stage={v.stage} postEvidence={postEvidence} />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5">
        <div className="flex flex-col gap-5">
          <GatePanel gates={ev.gates} role={user.role} onAction={onGateAction} blockedActions={blockedActions} />
          <VatPanel vat={ev.vat} />
          <EvidencePanel
            vehicleId={id}
            data={data}
            role={user.role}
            onUpload={(kind) => setModal({ type: 'upload', kind })}
            onVerify={(evidenceId, approve) => run(store.verifyEvidence(evidenceId, approve), approve ? '증빙을 검증했습니다' : '증빙을 반려했습니다')}
          />
          <SalePanel vehicleId={id} data={data} />
        </div>
        <div className="flex flex-col gap-5">
          {ev.release && <ReleaseCard release={ev.release} data={data} />}
          <AuditTrail vehicleId={id} data={data} />
        </div>
      </div>

      {modal?.type === 'handover' && <HandoverModal vehicleId={id} onClose={() => setModal(null)} />}
      {modal?.type === 'upload' && <EvidenceUploadModal vehicleId={id} kind={modal.kind} onClose={() => setModal(null)} />}
      {modal?.type === 'acknowledge' && <AcknowledgeModal vehicleId={id} gate={modal.gate} onClose={() => setModal(null)} />}
      {modal?.type === 'fixSale' && <FixSaleModal vehicleId={id} onClose={() => setModal(null)} />}
      {modal?.type === 'release' && <ReleaseRequestModal vehicleId={id} onClose={() => setModal(null)} />}
    </div>
  )
}

function Hint({ children, danger }: { children: string; danger?: boolean }) {
  return <span className={danger ? 'w-full text-right text-caption-md text-red-60' : 'w-full text-right text-caption-md text-gray-70'}>{children}</span>
}

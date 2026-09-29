import { CONFIRM_BLOCKERS, ROLE_LABEL, TODAY } from './constants'
import { evaluateGates, riskOf } from './gates'
import { addDays } from './format'
import { calcVat, type VatSummary } from './vat'
import type { ConditionalRelease, ErpData, GateCode, GateResult, Risk, Role } from './types'

// ── 역할 권한 ─────────────────────────────────────────────
export type Permission =
  | 'REGISTER_PURCHASE'
  | 'HANDOVER'
  | 'CONFIRM_PURCHASE'
  | 'UPLOAD_EVIDENCE'
  | 'VERIFY_EVIDENCE'
  | 'ACKNOWLEDGE_GATE'
  | 'REGISTER_SALE'
  | 'REQUEST_RELEASE'
  | 'DECIDE_RELEASE'
  | 'CREATE_SLIP'
  | 'DECIDE_SLIP'
  | 'PROCESS_SHIPMENT'
  | 'FIX_EXPORT'
  | 'RECHECK_VIN'
  | 'WRITE_OFF_VAT'

const PERMISSIONS: Record<Role, Permission[]> = {
  PURCHASER: ['REGISTER_PURCHASE', 'HANDOVER', 'CONFIRM_PURCHASE', 'UPLOAD_EVIDENCE', 'RECHECK_VIN'],
  SALES: ['REGISTER_SALE', 'REQUEST_RELEASE', 'CREATE_SLIP', 'UPLOAD_EVIDENCE'],
  ACCOUNTING: ['VERIFY_EVIDENCE', 'ACKNOWLEDGE_GATE', 'DECIDE_RELEASE', 'DECIDE_SLIP', 'WRITE_OFF_VAT'],
  LOGISTICS: ['PROCESS_SHIPMENT', 'FIX_EXPORT', 'RECHECK_VIN'],
}

export const can = (role: Role, permission: Permission) => PERMISSIONS[role].includes(permission)

/** 권한이 없을 때 버튼 옆에 보여줄 안내 */
export const permissionHint = (permission: Permission) => {
  const roles = (Object.keys(PERMISSIONS) as Role[]).filter((r) => can(r, permission))
  return `${roles.map((r) => ROLE_LABEL[r]).join('·')} 담당 권한`
}

// ── 판정 결과 모음 ────────────────────────────────────────
export interface Evaluation {
  gates: GateResult[]
  risk: Risk
  vat: VatSummary
  release?: ConditionalRelease
  /** 조건부 선적 승인으로 남은 Soft 게이트가 모두 커버되는가 */
  releaseCovers: boolean
}

/** 차량의 가장 최근 조건부 선적 (반려 제외) */
export const activeRelease = (vehicleId: string, db: ErpData) =>
  db.releases.filter((r) => r.vehicleId === vehicleId && r.status !== 'REJECTED').at(-1)

export function evaluate(vehicleId: string, db: ErpData): Evaluation {
  const gates = evaluateGates(vehicleId, db)
  const p = db.purchases[vehicleId]
  const release = activeRelease(vehicleId, db)
  const soft = gates.filter((g) => g.severity === 'SOFT')
  return {
    gates,
    risk: riskOf(gates),
    vat: calcVat(p, db.evidences.filter((e) => e.vehicleId === vehicleId), db.policy),
    release,
    releaseCovers: release?.status === 'APPROVED' && soft.every((g) => release.gateCodes.includes(g.code)),
  }
}

export const evaluateAll = (db: ErpData) =>
  Object.fromEntries(Object.keys(db.vehicles).map((id) => [id, evaluate(id, db)])) as Record<string, Evaluation>

// ── 상태 전이 가드 ────────────────────────────────────────
export interface Guard {
  ok: boolean
  reasons: string[]
}

const guard = (reasons: (string | false | undefined)[]): Guard => {
  const r = reasons.filter(Boolean) as string[]
  return { ok: r.length === 0, reasons: r }
}

export function canConfirmPurchase(vehicleId: string, db: ErpData, ev = evaluate(vehicleId, db)): Guard {
  const stage = db.vehicles[vehicleId].stage
  return guard([
    !['PURCHASE_REGISTERED', 'HANDED_OVER'].includes(stage) && '매입 확정 단계가 아닙니다.',
    ...ev.gates.filter((g) => CONFIRM_BLOCKERS.includes(g.code)).map((g) => `[${g.code}] ${g.title}`),
  ])
}

export function canAddToSlip(vehicleId: string, db: ErpData, ev = evaluate(vehicleId, db)): Guard {
  const stage = db.vehicles[vehicleId].stage
  const hard = ev.gates.filter((g) => g.severity === 'HARD')
  const soft = ev.gates.filter((g) => g.severity === 'SOFT')
  return guard([
    stage !== 'SALE_REGISTERED' && '수출 검증 단계 차량만 선적 전표에 담을 수 있습니다.',
    ...hard.map((g) => `[${g.code}] ${g.title} — 우회 불가`),
    soft.length > 0 && !ev.releaseCovers && '보완 항목이 있습니다. 조건부 선적 승인이 필요합니다.',
  ])
}

/** 기한이 지났는데 보완되지 않은 조건부 선적 */
export function isOverdue(release: ConditionalRelease, db: ErpData) {
  if (release.status !== 'APPROVED' || release.resolvedAt || release.dueDate >= TODAY) return false
  const open = evaluateGates(release.vehicleId, db).filter((g) => release.gateCodes.includes(g.code))
  return open.length > 0
}

/** 승인됐지만 아직 보완이 끝나지 않은 조건부 선적 */
/** 매입 증빙 게이트 — 사후 증빙을 끝내 받지 못하면 불공제 확정으로 종결할 수 있다 */
export const EVIDENCE_GATES: GateCode[] = ['S1', 'S2', 'S3']

/** 불공제 확정 — 선적 완료 후 사후 보완 중인 차량의 매입 증빙 항목만 대상 */
export function canWriteOff(vehicleId: string, db: ErpData, ev = evaluate(vehicleId, db)): Guard {
  return guard([
    db.vehicles[vehicleId].stage !== 'SHIPPED' && '선적 완료 후 사후 보완 중인 차량만 불공제 확정할 수 있습니다.',
    !ev.gates.some((g) => EVIDENCE_GATES.includes(g.code)) && '확정할 매입 증빙 항목이 없습니다.',
  ])
}

/**
 * 조건부 선적 보완 기한 =min(요청일 + 정책 기한, 부가세 신고 마감 − 버퍼)
 * 신고 전에 증빙을 확보해야 매입세액을 공제받을 수 있으므로, 정책 기한이 남아 있어도 신고 마감에 맞춰 당긴다.
 */
export function releaseDueDate(days: number, policy: ErpData['policy']): { dueDate: string; cappedByFiling: boolean } {
  const byPolicy = addDays(TODAY, Math.min(days, policy.conditionalDueDays))
  const byFiling = addDays(policy.vatFilingDeadline, -policy.filingBufferDays)
  return byFiling < byPolicy ? { dueDate: byFiling, cappedByFiling: true } : { dueDate: byPolicy, cappedByFiling: false }
}

export const isOpenRelease =(release: ConditionalRelease) => release.status === 'APPROVED' && !release.resolvedAt

export function canRequestRelease(vehicleId: string, userId: string, db: ErpData, ev = evaluate(vehicleId, db)): Guard {
  const stage = db.vehicles[vehicleId].stage
  const mine = db.releases.filter((r) => r.ownerId === userId)
  const overdue = mine.filter((r) => isOverdue(r, db))
  const open = mine.filter(isOpenRelease)
  const soft = ev.gates.filter((g) => g.severity === 'SOFT')
  return guard([
    stage !== 'SALE_REGISTERED' && '수출 검증 단계 차량만 요청할 수 있습니다.',
    ev.gates.some((g) => g.severity === 'HARD') && '차단(Hard) 항목은 조건부 선적 대상이 아닙니다.',
    soft.length === 0 && '보완할 항목이 없습니다.',
    ev.release?.status === 'PENDING' && '이미 결재 대기 중입니다.',
    ev.releaseCovers && '이미 조건부 선적이 승인되었습니다.',
    overdue.length > 0 && `기한을 넘긴 사후 증빙 ${overdue.length}건이 있어 신규 요청이 제한됩니다.`,
    open.length >= db.policy.perUserOpenLimit &&
      `미해소 조건부 선적이 한도(${db.policy.perUserOpenLimit}건)에 도달했습니다.`,
  ])
}

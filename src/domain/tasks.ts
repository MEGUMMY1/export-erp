import { daysFromToday, formatDate, formatKRW } from './format'
import { canAddToSlip, canConfirmPurchase, isOpenRelease, isOverdue, type Evaluation } from './rules'
import type { ErpData, User } from './types'

export type TaskTone = 'error' | 'warning' | 'success' | 'info'

/** 알림 = 담당자가 바로 행동할 수 있는 업무 Task */
export interface Task {
  id: string
  tone: TaskTone
  title: string
  description: string
  to: string
  actionLabel: string
}

const TONE_ORDER: TaskTone[] = ['error', 'warning', 'info', 'success']

export function tasksFor(user: User, db: ErpData, evals: Record<string, Evaluation>): Task[] {
  const vehicles = Object.values(db.vehicles)
  const inStage = (stage: string) => vehicles.filter((v) => v.stage === stage)
  const withGate = (code: string) =>
    vehicles.filter((v) => v.stage === 'SALE_REGISTERED' && evals[v.id]?.gates.some((g) => g.code === code))
  const tasks: Task[] = []
  const add = (task: Task, count: number) => count > 0 && tasks.push(task)

  const overdue = db.releases.filter((r) => isOverdue(r, db))

  if (user.role === 'PURCHASER') {
    const waiting = inStage('PURCHASE_REGISTERED')
    const confirmable = inStage('HANDED_OVER').filter((v) => canConfirmPurchase(v.id, db, evals[v.id]).ok)
    const identity = vehicles.filter((v) => evals[v.id]?.gates.some((g) => g.code === 'H5'))
    add({ id: 'pur-handover', tone: 'warning', title: `실물 인수 대기 ${waiting.length}대`, description: '인수 확인과 외관 사진이 있어야 매입을 확정할 수 있습니다.', to: '/workbench?tab=purchase', actionLabel: '인수 처리' }, waiting.length)
    add({ id: 'pur-identity', tone: 'error', title: `매도인 신원 미확인 ${identity.length}대`, description: '신분증 사본이 없으면 장물 여부를 확인할 수 없어 매입 확정이 차단됩니다.', to: '/workbench?tab=purchase&gate=H5', actionLabel: '증빙 올리기' }, identity.length)
    add({ id: 'pur-confirm', tone: 'success', title: `매입 확정 가능 ${confirmable.length}대`, description: '인수가 끝났고 차단 항목이 없습니다.', to: '/workbench?tab=purchase', actionLabel: '확정하기' }, confirmable.length)
  }

  if (user.role === 'SALES') {
    const ready = inStage('SALE_REGISTERED').filter((v) => canAddToSlip(v.id, db, evals[v.id]).ok)
    const released = ready.filter((v) => evals[v.id].releaseCovers)
    const unsold = inStage('PURCHASE_CONFIRMED')
    const mineOverdue = overdue.filter((r) => r.ownerId === user.id)
    const mineSoon = db.releases.filter(
      (r) => r.ownerId === user.id && isOpenRelease(r) && !isOverdue(r, db) && daysFromToday(r.dueDate) <= 2,
    )
    add({ id: 'sal-overdue', tone: 'error', title: `사후 증빙 기한 초과 ${mineOverdue.length}건`, description: '보완 전까지 신규 조건부 선적 요청이 제한됩니다.', to: '/workbench?tab=post', actionLabel: '증빙 올리기' }, mineOverdue.length)
    add({ id: 'sal-soon', tone: 'warning', title: `사후 증빙 기한 임박 ${mineSoon.length}건`, description: '기한 내 보완하지 않으면 신규 조건부 선적이 제한됩니다.', to: '/workbench?tab=post', actionLabel: '확인하기' }, mineSoon.length)
    add({ id: 'sal-ready', tone: 'success', title: `선적 전표 편입 가능 ${ready.length}대`, description: released.length ? `조건부 승인 ${released.length}대 포함` : '검증을 통과한 차량입니다.', to: '/workbench?risk=READY', actionLabel: '전표에 담기' }, ready.length)
    add({ id: 'sal-unsold', tone: 'info', title: `판매 등록 대기 ${unsold.length}대`, description: '매입 확정된 차량입니다. 차량 정보는 매입 데이터에서 자동 연결됩니다.', to: '/sales/new', actionLabel: '판매 등록' }, unsold.length)
  }

  if (user.role === 'ACCOUNTING') {
    const pending = db.releases.filter((r) => r.status === 'PENDING')
    const pendingVat = pending.reduce((sum, r) => sum + r.vatImpact, 0)
    const slips = Object.values(db.shipments).filter((s) => s.status === 'PENDING')
    const verify = new Set(db.evidences.filter((e) => e.status === 'SUBMITTED').map((e) => e.vehicleId))
    const repeat = withGate('S4')
    const unsecured = vehicles.reduce((sum, v) => sum + (v.stage === 'CLOSED' ? 0 : (evals[v.id]?.vat.unsecured ?? 0)), 0)
    const deadline = daysFromToday(db.policy.vatFilingDeadline)
    add({ id: 'acc-overdue', tone: 'error', title: `사후 증빙 기한 초과 ${overdue.length}건`, description: '담당자의 신규 조건부 선적이 자동 제한되었습니다.', to: '/workbench?tab=post', actionLabel: '확인하기' }, overdue.length)
    add({ id: 'acc-release', tone: 'warning', title: `조건부 선적 결재 대기 ${pending.length}건`, description: `미확보 매입세액 ${formatKRW(pendingVat)}`, to: '/shipments?tab=releases', actionLabel: '결재하기' }, pending.length)
    add({ id: 'acc-slip', tone: 'info', title: `선적 전표 결재 대기 ${slips.length}건`, description: `정상 차량 ${slips.reduce((n, s) => n + s.vehicleIds.length, 0)}대 일괄 결재`, to: '/shipments', actionLabel: '결재하기' }, slips.length)
    add({ id: 'acc-verify', tone: 'warning', title: `증빙 검증 대기 ${verify.size}대`, description: '제출된 증빙을 확인해야 매입세액이 확보됩니다.', to: '/workbench?gate=S1', actionLabel: '검증하기' }, verify.size)
    add({ id: 'acc-repeat', tone: 'warning', title: `개인 반복 매도인 ${repeat.length}대`, description: '사업자(위장 개인매입) 여부 확인이 필요합니다.', to: '/workbench?gate=S4', actionLabel: '검토하기' }, repeat.length)
    add({ id: 'acc-vat', tone: deadline <= 14 ? 'error' : 'info', title: `미확보 매입세액 ${formatKRW(unsecured)}`, description: `부가세 예정신고 마감 ${formatDate(db.policy.vatFilingDeadline)} (${deadline}일 남음)`, to: '/workbench?risk=REVIEW', actionLabel: '보완 대상 보기' }, unsecured)
  }

  if (user.role === 'LOGISTICS') {
    const approved = Object.values(db.shipments).filter((s) => s.status === 'APPROVED')
    const broker = withGate('S6')
    const decl = [...withGate('H6'), ...withGate('S7')]
    const expired = withGate('H3')
    add({ id: 'log-decl', tone: 'error', title: `수출신고필증 불일치 ${decl.length}대`, description: '신고필증과 ERP 정보가 다릅니다. 정정 후 재대조가 필요합니다.', to: '/workbench?gate=H6', actionLabel: '정정하기' }, decl.length)
    add({ id: 'log-vin', tone: 'error', title: `VIN 조회 만료 ${expired.length}대`, description: `조회 후 ${db.policy.vinCheckValidDays}일이 지나 선적이 차단됩니다.`, to: '/workbench?gate=H3', actionLabel: '재조회' }, expired.length)
    add({ id: 'log-ship', tone: 'success', title: `선적 처리 대기 전표 ${approved.length}건`, description: '결재 승인된 전표입니다. 선적 직전 VIN을 재조회합니다.', to: '/shipments', actionLabel: '선적 처리' }, approved.length)
    add({ id: 'log-broker', tone: 'warning', title: `통관 정보 누락 ${broker.length}대`, description: '관세사 또는 예정 선적일이 없습니다.', to: '/workbench?gate=S6', actionLabel: '보완하기' }, broker.length)
  }

  return tasks.sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone))
}

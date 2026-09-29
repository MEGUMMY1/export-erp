import { EVIDENCE_LABEL, GATE_META, PURCHASE_TYPE_LABEL, TODAY, stageIndex } from './constants'
import { daysBetween, formatDate, formatKRW } from './format'
import { calcVat } from './vat'
import type { ErpData, GateCode, GateResult, Risk } from './types'

/**
 * 차량 1대의 리스크 게이트를 판정한다. (순수 함수 — 화면·스토어 어디서든 같은 결과)
 * Hard Gate: 우회 불가 / Soft Gate: 조건부 선적(기한부)으로만 통과
 */
export function evaluateGates(vehicleId: string, db: ErpData): GateResult[] {
  const v = db.vehicles[vehicleId]
  const p = db.purchases[vehicleId]
  if (!v || !p || v.stage === 'CLOSED') return []

  const { policy } = db
  const idx = stageIndex(v.stage)
  const shipped = v.stage === 'SHIPPED'
  const vendor = db.vendors[p.vendorId]
  const evidences = db.evidences.filter((e) => e.vehicleId === vehicleId && e.status !== 'REJECTED')
  const sale = db.sales[vehicleId]
  const decl = db.exportDecls[vehicleId]
  const acknowledged = v.acknowledgedGates ?? []
  const vat = calcVat(p, evidences, policy)

  const out: GateResult[] = []
  const push = (code: GateCode, reason: string, extra: Partial<GateResult> = {}) => {
    if (acknowledged.includes(code)) return
    out.push({ code, ...GATE_META[code], reason, ...extra })
  }
  const has = (kind: string) => evidences.some((e) => e.kind === kind)

  // ── 차량·매입 (선적 전까지) ─────────────────────────────
  if (!shipped) {
    const c = v.vinCheck
    if (c?.theft) push('H2', `${formatDate(c.checkedAt)} 조회 결과 도난 신고 차량입니다. 거래를 중단해야 합니다.`)
    if (c && (c.seizure || c.lien)) {
      const kinds = [c.seizure && '압류', c.lien && '저당'].filter(Boolean).join('·')
      push('H1', `${formatDate(c.checkedAt)} 조회 결과 ${kinds} 등록 확인. 해제 전에는 수출 말소등록이 불가합니다.`)
    }
    if (!c) push('H3', 'VIN 압류·도난 조회 이력이 없습니다.')
    else {
      const elapsed = daysBetween(c.checkedAt, TODAY)
      if (elapsed > policy.vinCheckValidDays)
        push('H3', `마지막 조회 ${formatDate(c.checkedAt)} (${elapsed}일 경과, 유효기간 ${policy.vinCheckValidDays}일). 재조회가 필요합니다.`)
    }

    if (idx < stageIndex('PURCHASE_CONFIRMED')) {
      const h = p.handover
      const missing = [!h && '인수자 확인', !h?.plateChecked && '차량번호 확인', !(h && h.photoCount > 0) && '외관 사진'].filter(Boolean)
      if (missing.length) push('H4', `${missing.join(' · ')}이 완료되지 않았습니다.`)
    }

    if (vendor?.type === 'INDIVIDUAL' ? !has('ID_COPY') : !vendor?.bizRegNo)
      push('H5', vendor?.type === 'INDIVIDUAL' ? '매도인 신분증 사본이 없습니다. 장물 여부를 확인할 수 없습니다.' : '매입처 사업자등록번호가 없습니다.')
  }

  // ── 매입 증빙 (선적 후에도 사후 보완 대상) ──────────────
  const typeLabel = PURCHASE_TYPE_LABEL[p.purchaseType]
  const vatExtra = vat.unsecured > 0 ? { vatImpact: vat.unsecured } : {}
  const receiptOnly = p.purchaseType !== 'INDIVIDUAL' && !has('TAX_INVOICE') && has('SIMPLE_RECEIPT')
  if (receiptOnly) push('S2', `${typeLabel}은 세금계산서가 필요하지만 간이영수증만 있습니다.`, vatExtra)

  const required = policy.requiredEvidence[p.purchaseType].filter((k) => k !== 'ID_COPY')
  const missing = required.filter((k) => !has(k) && !(receiptOnly && k === 'TAX_INVOICE'))
  const unverified = required.filter((k) => has(k) && !evidences.some((e) => e.kind === k && e.status === 'VERIFIED'))
  const labels = (kinds: string[]) => kinds.map((k) => EVIDENCE_LABEL[k as keyof typeof EVIDENCE_LABEL]).join(', ')

  if (missing.length) {
    const cash = p.purchaseType === 'INDIVIDUAL' && p.paymentMethod === 'CASH' ? ' (현금 지급)' : ''
    push('S1', `미수취: ${labels(missing)}${cash}`, vatExtra)
  } else if (unverified.length) {
    push('S1', `제출됨 · 회계 검증 대기: ${labels(unverified)}`, {
      ...vatExtra,
      nextAction: 'VERIFY_EVIDENCE',
      ownerRole: 'ACCOUNTING',
    })
  }

  const invoice = evidences.find((e) => e.kind === 'TAX_INVOICE')
  if (invoice?.amount != null && invoice.amount !== p.amount) {
    push('S3', `세금계산서 ${formatKRW(invoice.amount)} / 등록 매입가 ${formatKRW(p.amount)} (차액 ${formatKRW(p.amount - invoice.amount)})`, vatExtra)
  }

  if (!shipped && vendor?.type === 'INDIVIDUAL') {
    const month = p.purchaseDate.slice(0, 7)
    const count = Object.values(db.purchases).filter((x) => x.vendorId === p.vendorId && x.purchaseDate.startsWith(month)).length
    if (count >= policy.repeatSellerThreshold)
      push('S4', `동일 개인 매도인(${vendor.name})에게서 이번 달 ${count}대 매입 — 사업자(위장 개인매입) 여부 확인이 필요합니다.`)
  }

  // ── 판매·수출 (선적 전까지) ─────────────────────────────
  if (sale && !shipped) {
    const saleKrw = sale.amount * sale.exchangeRate
    if (saleKrw < p.amount)
      push('S5', `매입 ${formatKRW(p.amount)} / 판매 ${formatKRW(saleKrw)} (예상 손익 ${formatKRW(saleKrw - p.amount)})`)

    const saleMissing = [!sale.customsBroker && '관세사', !sale.expectedShipmentDate && '예정 선적일'].filter(Boolean)
    if (saleMissing.length) push('S6', `${saleMissing.join(' · ')} 정보가 없습니다.`)

    if (sale.taxTreatment === 'DOMESTIC') push('S8', '국내 판매로 처리됩니다. 영세율 대상에서 제외되어 10% 과세 매출이 됩니다.')

    if (!decl) push('H7', '수출신고 전입니다. 수리 전에는 선적할 수 없습니다.')
    else {
      if (decl.extracted.vin !== v.vin)
        push('H6', `신고필증 ${decl.extracted.vin} ≠ ERP ${v.vin}. 다른 차량으로 신고되었을 수 있습니다.`)
      if (decl.extracted.plateNumber !== v.plateNumber)
        push('S7', `신고필증 차량번호 ${decl.extracted.plateNumber} ≠ ERP ${v.plateNumber}`)
      if (decl.status !== 'ACCEPTED') push('H7', `수출신고 미수리 (${decl.declNo}). 수리 전에는 선적할 수 없습니다.`)
    }
  }

  return out.sort((a, b) => (a.severity === b.severity ? a.code.localeCompare(b.code) : a.severity === 'HARD' ? -1 : 1))
}

export const riskOf = (gates: GateResult[]): Risk =>
  gates.some((g) => g.severity === 'HARD') ? 'BLOCKED' : gates.length ? 'REVIEW' : 'CLEAR'

import type { EvidenceKind, GateCode, NextAction, PurchaseType, Role, Severity, Stage } from './types'

/** 데모 기준일 — mock 데이터가 이 날짜에 맞춰 생성되어 있다 */
export const TODAY = '2026-09-29'

export const STAGES: Stage[] = [
  'PURCHASE_REGISTERED',
  'HANDED_OVER',
  'PURCHASE_CONFIRMED',
  'SALE_REGISTERED',
  'IN_SLIP',
  'SHIPPED',
  'CLOSED',
]

export const STAGE_LABEL: Record<Stage, string> = {
  PURCHASE_REGISTERED: '매입 등록',
  HANDED_OVER: '인수 완료',
  PURCHASE_CONFIRMED: '매입 확정',
  SALE_REGISTERED: '수출 검증',
  IN_SLIP: '선적 전표',
  SHIPPED: '선적 완료',
  CLOSED: '종결',
}

export const stageIndex = (stage: Stage) => STAGES.indexOf(stage)

export const ROLE_LABEL: Record<Role, string> = {
  PURCHASER: '매입',
  SALES: '영업',
  ACCOUNTING: '회계',
  LOGISTICS: '물류',
}

export const PURCHASE_TYPE_LABEL: Record<PurchaseType, string> = {
  DEALER: '딜러 매입',
  AUCTION: '경매 매입',
  INDIVIDUAL: '개인 매입',
}

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  TAX_INVOICE: '세금계산서',
  SIMPLE_RECEIPT: '간이영수증',
  CONTRACT: '매매계약서',
  AUCTION_CONFIRMATION: '낙찰 확인서',
  ID_COPY: '매도인 신분증 사본',
  TRANSFER_RECEIPT: '대금 계좌이체 내역',
  OWNERSHIP_TRANSFER: '자동차 양도 서류',
}

interface GateMeta {
  severity: Severity
  title: string
  nextAction: NextAction
  ownerRole: Role
}

export const GATE_META: Record<GateCode, GateMeta> = {
  H1: { severity: 'HARD', title: 'VIN 압류·저당', nextAction: 'UPLOAD_RELEASE_PROOF', ownerRole: 'PURCHASER' },
  H2: { severity: 'HARD', title: 'VIN 도난 조회', nextAction: 'STOP_DEAL', ownerRole: 'PURCHASER' },
  H3: { severity: 'HARD', title: 'VIN 조회 만료', nextAction: 'RECHECK_VIN', ownerRole: 'LOGISTICS' },
  H4: { severity: 'HARD', title: '실물 인수 미확인', nextAction: 'HANDOVER', ownerRole: 'PURCHASER' },
  H5: { severity: 'HARD', title: '매도인 신원 미확인', nextAction: 'UPLOAD_EVIDENCE', ownerRole: 'PURCHASER' },
  H6: { severity: 'HARD', title: '수출신고필증 VIN 불일치', nextAction: 'CORRECT_DECL', ownerRole: 'LOGISTICS' },
  H7: { severity: 'HARD', title: '수출신고 미수리', nextAction: 'ACCEPT_DECL', ownerRole: 'LOGISTICS' },
  S1: { severity: 'SOFT', title: '매입 증빙 미비', nextAction: 'UPLOAD_EVIDENCE', ownerRole: 'PURCHASER' },
  S2: { severity: 'SOFT', title: '증빙 유형 불일치', nextAction: 'UPLOAD_EVIDENCE', ownerRole: 'PURCHASER' },
  S3: { severity: 'SOFT', title: '증빙 금액 불일치', nextAction: 'UPLOAD_EVIDENCE', ownerRole: 'PURCHASER' },
  S4: { severity: 'SOFT', title: '개인 반복 매도인', nextAction: 'ACKNOWLEDGE', ownerRole: 'ACCOUNTING' },
  S5: { severity: 'SOFT', title: '역마진 거래', nextAction: 'CONDITIONAL_RELEASE', ownerRole: 'SALES' },
  S6: { severity: 'SOFT', title: '통관 정보 누락', nextAction: 'FIX_SALE', ownerRole: 'LOGISTICS' },
  S7: { severity: 'SOFT', title: '서류 정보 불일치', nextAction: 'CORRECT_DECL', ownerRole: 'LOGISTICS' },
  S8: { severity: 'SOFT', title: '국내 판매 전환', nextAction: 'ACKNOWLEDGE', ownerRole: 'ACCOUNTING' },
}

/** 매입 확정을 막는 게이트 */
export const CONFIRM_BLOCKERS: GateCode[] = ['H1', 'H2', 'H3', 'H4', 'H5']

/** 회계 확인만으로 해소할 수 있는 Soft 게이트 */
export const ACKNOWLEDGEABLE: GateCode[] = ['S4', 'S5', 'S8']

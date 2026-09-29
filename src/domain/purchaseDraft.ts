import { TODAY } from './constants'
import { VIN_PATTERN, lookupVin } from './vin'
import type { ErpData, Evidence, EvidenceKind, PaymentMethod, PurchaseType, Stage, Vendor } from './types'

/** 매입 등록 화면의 입력값 */
export interface PurchaseDraft {
  vin: string
  plateNumber: string
  manufacturer: string
  model: string
  modelYear: number | null
  mileage: number | null
  purchaseType: PurchaseType
  /** 딜러·경매 매입처 */
  vendorId: string | null
  /** 개인 매도인 성명 */
  sellerName: string
  amount: number | null
  paymentMethod: PaymentMethod
  purchaseDate: string
  evidences: { kind: EvidenceKind; fileName: string }[]
  handover: { plateChecked: boolean; photoCount: number }
}

export interface DraftIds {
  vehicleId: string
  vendorId: string
  evidenceId: (kind: EvidenceKind) => string
}

export const PREVIEW_IDS: DraftIds = {
  vehicleId: 'DRAFT',
  vendorId: 'DRAFT-VENDOR',
  evidenceId: (kind) => `DRAFT-${kind}`,
}

export const isHandoverDone = (d: PurchaseDraft) => d.handover.plateChecked && d.handover.photoCount > 0

/** 등록에 필요한 필수값 검증 */
export function validateDraft(d: PurchaseDraft, db: ErpData): string[] {
  return [
    !VIN_PATTERN.test(d.vin) && 'VIN은 17자리(I·O·Q 제외)여야 합니다.',
    Object.values(db.vehicles).some((v) => v.vin === d.vin) && '이미 등록된 VIN입니다.',
    !d.plateNumber.trim() && '차량번호를 입력해 주세요.',
    (!d.manufacturer || !d.model) && '제조사와 모델을 선택해 주세요.',
    !d.modelYear && '연식을 선택해 주세요.',
    d.purchaseType === 'INDIVIDUAL' ? !d.sellerName.trim() && '매도인 성명을 입력해 주세요.' : !d.vendorId && '매입처를 선택해 주세요.',
    !(d.amount && d.amount > 0) && '매입가를 입력해 주세요.',
    (!d.purchaseDate || d.purchaseDate > TODAY) && '매입일은 오늘 이전이어야 합니다.',
  ].filter(Boolean) as string[]
}

/**
 * 초안을 데이터에 반영한다. 미리보기(PREVIEW_IDS)와 실제 등록이 같은 함수를 쓰므로
 * 화면에서 본 판정과 등록 후 판정이 항상 같다.
 */
export function applyDraft(db: ErpData, d: PurchaseDraft, ids: DraftIds, actorId: string, at: string): ErpData {
  const individual = d.purchaseType === 'INDIVIDUAL'
  const vendorId = individual ? ids.vendorId : (d.vendorId ?? '')
  const vendors: Record<string, Vendor> = individual
    ? { ...db.vendors, [vendorId]: { id: vendorId, name: d.sellerName.trim() || '(미입력)', type: 'INDIVIDUAL' } }
    : db.vendors
  const stage: Stage = isHandoverDone(d) ? 'HANDED_OVER' : 'PURCHASE_REGISTERED'
  const vinCheck = VIN_PATTERN.test(d.vin) ? lookupVin(d.vin, db, at) : undefined
  const evidences: Evidence[] = d.evidences.map((e) => ({
    id: ids.evidenceId(e.kind),
    vehicleId: ids.vehicleId,
    kind: e.kind,
    fileName: e.fileName,
    amount: e.kind === 'TAX_INVOICE' || e.kind === 'SIMPLE_RECEIPT' ? (d.amount ?? 0) : undefined,
    uploadedBy: actorId,
    uploadedAt: at,
    status: 'SUBMITTED',
  }))

  return {
    ...db,
    vendors,
    vehicles: {
      ...db.vehicles,
      [ids.vehicleId]: {
        id: ids.vehicleId,
        vin: d.vin,
        plateNumber: d.plateNumber.trim(),
        manufacturer: d.manufacturer,
        model: d.model,
        modelYear: d.modelYear ?? 0,
        mileage: d.mileage ?? 0,
        stage,
        vinCheck: vinCheck && { checkedAt: vinCheck.checkedAt, seizure: vinCheck.seizure, lien: vinCheck.lien, theft: vinCheck.theft },
      },
    },
    purchases: {
      ...db.purchases,
      [ids.vehicleId]: {
        vehicleId: ids.vehicleId,
        vendorId,
        purchaseType: d.purchaseType,
        amount: d.amount ?? 0,
        paymentMethod: d.paymentMethod,
        purchaseDate: d.purchaseDate,
        purchaserId: actorId,
        handover: isHandoverDone(d) ? { receiverId: actorId, plateChecked: true, photoCount: d.handover.photoCount, at } : undefined,
      },
    },
    evidences: [...db.evidences, ...evidences],
  }
}

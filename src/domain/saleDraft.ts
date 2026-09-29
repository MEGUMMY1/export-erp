import type { Currency, ErpData, TaxTreatment } from './types'
import { calcVat } from './vat'

/** 판매 등록 화면의 입력값 */
export interface SaleDraft {
  buyerId: string | null
  currency: Currency
  amount: number | null
  incoterms: string
  taxTreatment: TaxTreatment
  customsBroker: string | null
  expectedShipmentDate: string
}

export const INCOTERMS = ['FOB', 'CFR', 'CIF']

export function validateSale(vehicleId: string | null, d: SaleDraft, db: ErpData): string[] {
  return [
    !vehicleId && '판매할 차량을 선택해 주세요.',
    vehicleId && db.vehicles[vehicleId]?.stage !== 'PURCHASE_CONFIRMED' && '매입 확정된 차량만 판매 등록할 수 있습니다.',
    !d.buyerId && '바이어를 선택해 주세요.',
    !(d.amount && d.amount > 0) && '판매가를 입력해 주세요.',
  ].filter(Boolean) as string[]
}

/**
 * 판매 등록 차단 사유 (필수 입력과 별개) — 매입 확정 후 VIN 재조회에서 압류·저당·도난이 나온 차량만 막는다.
 * 부가세 이중 손실(증빙 미확보 매입 + 국내 과세 매출)은 불법이 아닌 손실이므로 등록은 허용하고,
 * [S8]에 손실 금액을 실어 회계 확인 전까지 다음 단계로 넘어가지 못하게 한다.
 */
export function saleBlockReason(vehicleId: string | null, db: ErpData): string | null {
  if (!vehicleId) return null
  const vc = db.vehicles[vehicleId]?.vinCheck
  return vc && (vc.theft || vc.seizure || vc.lien) ? '압류·저당·도난 차량은 판매 등록할 수 없습니다. 해제 확인 후 VIN을 재조회해 주세요.' : null
}

/** 부가세 이중 손실 여부 — 매입세액을 확보하지 못한 차량을 국내 과세 매출로 처리 */
export function isDoubleLoss(vehicleId: string | null, d: Pick<SaleDraft, 'taxTreatment'>, db: ErpData): boolean {
  if (!vehicleId || d.taxTreatment !== 'DOMESTIC') return false
  const purchase = db.purchases[vehicleId]
  if (!purchase) return false
  return calcVat(purchase, db.evidences.filter((e) => e.vehicleId === vehicleId), db.policy).unsecured > 0
}

/** 판매가 원화 환산 — 등록 시점 환율로 예상 손익을 본다 (영세율 과세표준은 선적 처리 시 선적일 기준환율로 확정) */
export const saleKrw = (d: Pick<SaleDraft, 'amount' | 'currency'>, db: ErpData) => (d.amount ?? 0) * db.rates[d.currency]

/**
 * 판매 초안을 데이터에 반영한다 — 미리보기와 실제 등록이 같은 함수를 쓴다.
 * 수출신고는 관세사 연동을 생략하고, 등록 시 신고필증(차량 정보와 일치)이 수리된 것으로 둔다.
 */
export function applySale(db: ErpData, vehicleId: string, d: SaleDraft, salesNo: string, actorId: string, at: string): ErpData {
  const v = db.vehicles[vehicleId]
  const buyer = d.buyerId ? db.buyers[d.buyerId] : undefined
  return {
    ...db,
    vehicles: { ...db.vehicles, [vehicleId]: { ...v, stage: 'SALE_REGISTERED' } },
    sales: {
      ...db.sales,
      [vehicleId]: {
        vehicleId,
        salesNo,
        buyerId: d.buyerId ?? '',
        exportCountry: buyer?.country ?? '',
        amount: d.amount ?? 0,
        currency: d.currency,
        exchangeRate: db.rates[d.currency],
        incoterms: d.incoterms,
        taxTreatment: d.taxTreatment,
        customsBroker: d.customsBroker ?? undefined,
        expectedShipmentDate: d.expectedShipmentDate || undefined,
        salesDate: at.slice(0, 10),
        salesPersonId: actorId,
      },
    },
    exportDecls: {
      ...db.exportDecls,
      [vehicleId]: {
        vehicleId,
        declNo: `EX-${salesNo.slice(3)}`,
        status: 'ACCEPTED',
        extracted: { vin: v.vin, plateNumber: v.plateNumber },
      },
    },
  }
}

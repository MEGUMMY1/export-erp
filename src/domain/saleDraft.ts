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
 * 부가세 이중 손실 차단 — 매입세액을 확보하지 못한 차량(현금·무증빙 매입)을 국내 과세 매출로 처리하면
 * 공제는 못 받고 매출세액만 생긴다. 판매 등록 자체를 막고 수출(영세율) 처리나 증빙 확보를 요구한다.
 */
export function doubleLossReason(vehicleId: string | null, d: SaleDraft, db: ErpData): string | null {
  if (!vehicleId || d.taxTreatment !== 'DOMESTIC') return null
  const purchase = db.purchases[vehicleId]
  if (!purchase) return null
  const vat = calcVat(purchase, db.evidences.filter((e) => e.vehicleId === vehicleId), db.policy)
  return vat.unsecured > 0 ? '매입세액을 확보하지 못한 차량은 국내 판매로 등록할 수 없습니다. 영세율(수출)로 처리하거나 매입 증빙을 먼저 받아 주세요.' : null
}

/** 판매가 원화 환산 (등록 시점 환율 고정) */
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

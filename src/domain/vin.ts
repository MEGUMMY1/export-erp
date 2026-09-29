import type { ErpData, VinCheck } from './types'

/** VIN 형식: 17자리, I·O·Q 제외 */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

export const normalizeVin = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17)

/** 압류·도난 조회 (외부 연동 mock — vinRegistry에 없으면 이상 없음) */
export function lookupVin(vin: string, db: ErpData, checkedAt: string): VinCheck & { note?: string } {
  const record = db.vinRegistry[vin]
  return {
    checkedAt,
    seizure: !!record?.seizure,
    lien: !!record?.lien,
    theft: !!record?.theft,
    note: record?.note,
  }
}

export const vinResultLabel = (c: VinCheck) =>
  c.theft ? '도난 신고 확인' : c.seizure || c.lien ? '압류·저당 확인' : '이상 없음'

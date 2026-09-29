import type {
  AuditLog,
  Buyer,
  ConditionalRelease,
  ErpData,
  Evidence,
  ExportDeclaration,
  Policy,
  Purchase,
  Sale,
  Shipment,
  User,
  Vehicle,
  Vendor,
  VinRecord,
} from '../domain/types'
import auditLogs from './auditLogs.json'
import releases from './conditionalReleases.json'
import evidences from './evidences.json'
import exportDecls from './exportDeclarations.json'
import masters from './masters.json'
import policy from './policy.json'
import purchases from './purchases.json'
import sales from './sales.json'
import shipments from './shipments.json'
import vehicles from './vehicles.json'
import vinRegistry from './vinRegistry.json'

const byKey = <T,>(rows: T[], key: (row: T) => string) => Object.fromEntries(rows.map((r) => [key(r), r]))

/** mock JSON(scripts/generate-mock.mjs 생성)을 스토어 초기 상태로 변환 */
export function loadMockData(): ErpData {
  return {
    users: masters.users as User[],
    vendors: byKey(masters.vendors as Vendor[], (v) => v.id),
    buyers: byKey(masters.buyers as Buyer[], (b) => b.id),
    brokers: masters.brokers,
    rates: masters.rates,
    policy: policy as Policy,
    vehicles: byKey(vehicles as Vehicle[], (v) => v.id),
    purchases: byKey(purchases as Purchase[], (p) => p.vehicleId),
    evidences: evidences as Evidence[],
    vinRegistry: byKey(vinRegistry as VinRecord[], (r) => r.vin),
    sales: byKey(sales as Sale[], (s) => s.vehicleId),
    exportDecls: byKey(exportDecls as ExportDeclaration[], (d) => d.vehicleId),
    shipments: byKey(shipments as Shipment[], (s) => s.id),
    releases: releases as ConditionalRelease[],
    auditLogs: auditLogs as AuditLog[],
  }
}

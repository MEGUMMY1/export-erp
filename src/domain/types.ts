export type Role = 'PURCHASER' | 'SALES' | 'ACCOUNTING' | 'LOGISTICS'

export interface User {
  id: string
  name: string
  role: Role
  title: string
}

export type PurchaseType = 'DEALER' | 'AUCTION' | 'INDIVIDUAL'
export type VendorType = 'BUSINESS' | 'AUCTION_HOUSE' | 'INDIVIDUAL'
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH'
export type Currency = 'KRW' | 'USD' | 'EUR'
export type TaxTreatment = 'ZERO_RATED' | 'DOMESTIC'

export interface Vendor {
  id: string
  name: string
  type: VendorType
  bizRegNo?: string
}

export interface Buyer {
  id: string
  name: string
  country: string
  port: string
}

export type EvidenceKind =
  | 'TAX_INVOICE'
  | 'SIMPLE_RECEIPT'
  | 'CONTRACT'
  | 'AUCTION_CONFIRMATION'
  | 'ID_COPY'
  | 'TRANSFER_RECEIPT'
  | 'OWNERSHIP_TRANSFER'

export type EvidenceStatus = 'SUBMITTED' | 'VERIFIED' | 'REJECTED'

export interface Evidence {
  id: string
  vehicleId: string
  kind: EvidenceKind
  fileName: string
  amount?: number
  uploadedBy: string
  uploadedAt: string
  status: EvidenceStatus
  verifiedBy?: string
  verifiedAt?: string
}

/** 진행 단계 — 차량이 업무상 어디에 있는가 */
export type Stage =
  | 'PURCHASE_REGISTERED'
  | 'HANDED_OVER'
  | 'PURCHASE_CONFIRMED'
  | 'SALE_REGISTERED'
  | 'IN_SLIP'
  | 'SHIPPED'
  | 'CLOSED'

export interface VinCheck {
  checkedAt: string
  seizure: boolean
  lien: boolean
  theft: boolean
}

/** 외부 압류·도난 조회 결과 (mock) */
export interface VinRecord {
  vin: string
  seizure: boolean
  lien: boolean
  theft: boolean
  note?: string
}

export interface Vehicle {
  id: string
  vin: string
  plateNumber: string
  manufacturer: string
  model: string
  modelYear: number
  mileage: number
  stage: Stage
  vinCheck?: VinCheck
  shipmentId?: string
  /** 회계 확인으로 해소된 Soft 게이트 (S4·S5·S8) */
  acknowledgedGates?: GateCode[]
  /** 사후 증빙을 끝내 받지 못해 회계가 매입세액 불공제를 확정한 기록 (매입 증빙 게이트 S1~S3 종결) */
  writeOff?: { at: string; by: string; amount: number; reason: string }
}

export interface Handover {
  receiverId: string
  plateChecked: boolean
  photoCount: number
  at: string
}

export interface Purchase {
  vehicleId: string
  vendorId: string
  purchaseType: PurchaseType
  /** 매입가 (원, 부가세 포함) */
  amount: number
  paymentMethod: PaymentMethod
  purchaseDate: string
  purchaserId: string
  handover?: Handover
}

export interface Sale {
  vehicleId: string
  salesNo: string
  buyerId: string
  exportCountry: string
  amount: number
  currency: Currency
  /** 판매 등록 시점 환율 — 예상 손익 계산용 (영세율 과세표준 환율이 아님) */
  exchangeRate: number
  /**
   * 선적일 기준환율 — 영세율 과세표준은 공급시기(선적일) 기준환율로 환산한다.
   * 선적 처리 시 기록. 선적 전에 대금을 환가했다면 환가한 금액이 과세표준이 된다(외화 입금 연동은 범위 밖).
   */
  shipmentRate?: number
  incoterms: string
  taxTreatment: TaxTreatment
  customsBroker?: string
  expectedShipmentDate?: string
  salesDate: string
  salesPersonId: string
}

export interface ExportDeclaration {
  vehicleId: string
  declNo: string
  status: 'FILED' | 'ACCEPTED'
  /** 수출신고필증에서 추출한 값 (AI 문서 대조 mock) */
  extracted: { vin: string; plateNumber: string }
}

export type ShipmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SHIPPED'

export interface Shipment {
  id: string
  slipNo: string
  vessel: string
  voyage: string
  departurePort: string
  arrivalPort: string
  container: string
  scheduledDeparture: string
  vehicleIds: string[]
  status: ShipmentStatus
  createdBy: string
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  rejectReason?: string
  shippedAt?: string
  /** 선적 처리 시 제외된 차량과 사유 */
  excluded?: { vehicleId: string; reasons: string[] }[]
}

export type ReleaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 조건부 선적 — Soft Gate를 기한부로 풀어주는 예외 승인 */
export interface ConditionalRelease {
  id: string
  vehicleId: string
  gateCodes: GateCode[]
  dueDate: string
  ownerId: string
  requestedBy: string
  requestedAt: string
  reason: string
  vatImpact: number
  status: ReleaseStatus
  decidedBy?: string
  decidedAt?: string
  decisionNote?: string
  resolvedAt?: string
  /** 종결 방식 — 증빙 보완 완료 / 증빙 미확보로 불공제 확정 */
  outcome?: 'RESOLVED' | 'WRITTEN_OFF'
}

export interface AuditLog {
  id: string
  vehicleId?: string
  shipmentId?: string
  action: string
  actorId: string
  at: string
  prevStage?: Stage
  nextStage?: Stage
  reason?: string
}

export type NotificationSeverity = 'error' | 'warning' | 'info' | 'success'

/** 알림 — 업무가 일어난 순간 담당 역할(또는 특정 사용자)에게 전달되는 기록 */
export interface Notification {
  id: string
  at: string
  severity: NotificationSeverity
  title: string
  message: string
  /** 누르면 이동할 화면 */
  link: string
  /** 받는 역할 */
  roles: Role[]
  /** 받는 사용자 (역할과 별개로 지정) */
  userIds?: string[]
  /** 알림을 만든 행동의 수행자 — 본인에게는 보내지 않는다 */
  actorId: string
  vehicleId?: string
  readBy: string[]
}

export interface Policy {
  conditionalDueDays: number
  perUserOpenLimit: number
  repeatSellerThreshold: number
  vinCheckValidDays: number
  vatFilingDeadline: string
  /** 조건부 선적 보완 기한은 부가세 신고 마감보다 이만큼 앞서야 한다 (신고 전 증빙 확보) */
  filingBufferDays: number
  requiredEvidence: Record<PurchaseType, EvidenceKind[]>
  vatEvidence: Record<PurchaseType, EvidenceKind[]>
}

export type GateCode =
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'H7'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
  | 'S7'
  | 'S8'

export type Severity = 'HARD' | 'SOFT'

/** 게이트를 해소하기 위한 다음 행동 */
export type NextAction =
  | 'STOP_DEAL'
  | 'UPLOAD_RELEASE_PROOF'
  | 'RECHECK_VIN'
  | 'HANDOVER'
  | 'UPLOAD_EVIDENCE'
  | 'VERIFY_EVIDENCE'
  | 'CORRECT_DECL'
  | 'ACCEPT_DECL'
  | 'ACKNOWLEDGE'
  | 'FIX_SALE'
  | 'CONDITIONAL_RELEASE'

export interface GateResult {
  code: GateCode
  severity: Severity
  title: string
  reason: string
  nextAction: NextAction
  ownerRole: Role
  /** 이 게이트 때문에 공제받지 못하는 매입세액 */
  vatImpact?: number
}

export type Risk = 'CLEAR' | 'REVIEW' | 'BLOCKED'

export interface ErpData {
  users: User[]
  vendors: Record<string, Vendor>
  buyers: Record<string, Buyer>
  brokers: string[]
  rates: Record<Currency, number>
  policy: Policy
  vehicles: Record<string, Vehicle>
  purchases: Record<string, Purchase>
  evidences: Evidence[]
  vinRegistry: Record<string, VinRecord>
  sales: Record<string, Sale>
  exportDecls: Record<string, ExportDeclaration>
  shipments: Record<string, Shipment>
  releases: ConditionalRelease[]
  auditLogs: AuditLog[]
  notifications: Notification[]
}

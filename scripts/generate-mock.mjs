// 데모용 mock 데이터 생성기 — 결정적 시드라 실행할 때마다 같은 결과가 나온다.
// 실행: node scripts/generate-mock.mjs  →  src/mock/*.json
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../src/mock/', import.meta.url))

// mock 기록은 모두 기준일(9/29) 이전 — 시연 중 새로 남기는 기록이 항상 가장 최근이 되도록
let seed = 20260929
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pad = (n, w = 3) => String(n).padStart(w, '0')
const ymd = (m, d) => `2026-${pad(m, 2)}-${pad(d, 2)}`
const at = (m, d, h = int(9, 17), min = int(0, 59)) => `${ymd(m, d)}T${pad(h, 2)}:${pad(min, 2)}`
const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return ymd(d.getMonth() + 1, d.getDate())
}
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── 기준정보 ────────────────────────────────────────────────
const users = [
  { id: 'U-PUR', name: '이매입', role: 'PURCHASER', title: '매입 담당' },
  { id: 'U-SAL1', name: '김영업', role: 'SALES', title: '영업 담당' },
  { id: 'U-SAL2', name: '이수출', role: 'SALES', title: '영업 담당' },
  { id: 'U-ACC', name: '박회계', role: 'ACCOUNTING', title: '회계 팀장' },
  { id: 'U-LOG', name: '최물류', role: 'LOGISTICS', title: '물류 담당' },
]

const dealers = [
  { id: 'D01', name: '한빛모터스', type: 'BUSINESS', bizRegNo: '214-81-35120' },
  { id: 'D02', name: '대성오토', type: 'BUSINESS', bizRegNo: '137-86-20417' },
  { id: 'D03', name: '미래카딜러', type: 'BUSINESS', bizRegNo: '305-81-77452' },
  { id: 'D04', name: '동부자동차상사', type: 'BUSINESS', bizRegNo: '128-86-41236' },
  { id: 'D05', name: '우리중고차', type: 'BUSINESS', bizRegNo: '415-81-90318' },
  { id: 'D06', name: '새한모터스', type: 'BUSINESS', bizRegNo: '220-87-15693' },
]
const auctions = [
  { id: 'A01', name: '서울오토옥션', type: 'AUCTION_HOUSE', bizRegNo: '117-81-60042' },
  { id: 'A02', name: '경기차량경매장', type: 'AUCTION_HOUSE', bizRegNo: '135-86-33218' },
  { id: 'A03', name: '중부오토경매', type: 'AUCTION_HOUSE', bizRegNo: '312-81-48805' },
]
const vendors = [...dealers, ...auctions, { id: 'I-REPEAT', name: '정○훈', type: 'INDIVIDUAL' }]

const buyers = [
  { id: 'B01', name: 'Al Noor Motors', country: '요르단', port: '아카바항' },
  { id: 'B02', name: 'Gulf Auto Trading', country: 'UAE', port: '제벨알리항' },
  { id: 'B03', name: 'Caucasus Auto', country: '조지아', port: '포티항' },
  { id: 'B04', name: 'Andes Autos', country: '칠레', port: '발파라이소항' },
  { id: 'B05', name: 'Anatolia Oto', country: '튀르키예', port: '메르신항' },
  { id: 'B06', name: 'Nile Car Import', country: '이집트', port: '알렉산드리아항' },
]
const brokers = ['한결관세사무소', '세움관세법인', '바른통관']
const rates = { KRW: 1, USD: 1385, EUR: 1510 }

const policy = {
  conditionalDueDays: 7,
  perUserOpenLimit: 3,
  repeatSellerThreshold: 3,
  vinCheckValidDays: 7,
  vatFilingDeadline: '2026-10-25',
  filingBufferDays: 5,
  requiredEvidence: {
    DEALER: ['TAX_INVOICE', 'CONTRACT'],
    AUCTION: ['TAX_INVOICE', 'AUCTION_CONFIRMATION'],
    INDIVIDUAL: ['CONTRACT', 'ID_COPY', 'TRANSFER_RECEIPT', 'OWNERSHIP_TRANSFER'],
  },
  vatEvidence: {
    DEALER: ['TAX_INVOICE'],
    AUCTION: ['TAX_INVOICE'],
    INDIVIDUAL: ['CONTRACT', 'TRANSFER_RECEIPT', 'OWNERSHIP_TRANSFER'],
  },
}

const MODELS = [
  { maker: '현대', model: '쏘나타', prefix: 'KMHE', price: [12, 22] },
  { maker: '현대', model: '그랜저', prefix: 'KMHF', price: [18, 35] },
  { maker: '현대', model: '아반떼', prefix: 'KMHD', price: [8, 16] },
  { maker: '현대', model: '투싼', prefix: 'KMHJ', price: [14, 24] },
  { maker: '현대', model: '싼타페', prefix: 'KMHS', price: [18, 32] },
  { maker: '현대', model: '포터2', prefix: 'KMFZ', price: [9, 17] },
  { maker: '기아', model: 'K5', prefix: 'KNAG', price: [11, 21] },
  { maker: '기아', model: '쏘렌토', prefix: 'KNAP', price: [19, 34] },
  { maker: '기아', model: '스포티지', prefix: 'KNAR', price: [13, 23] },
  { maker: '기아', model: '카니발', prefix: 'KNAM', price: [20, 36] },
  { maker: '기아', model: '봉고3', prefix: 'KNCS', price: [8, 15] },
  { maker: '제네시스', model: 'G80', prefix: 'KMTG', price: [28, 45] },
]
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
const makeVin = (prefix) => prefix + Array.from({ length: 17 - prefix.length }, () => pick(VIN_CHARS)).join('')
const HANGUL = '가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주'
const makePlate = () => `${int(10, 399)}${pick([...HANGUL])}${int(1000, 9999)}`
const makeName = () => `${pick([...'김이박최정강조윤장임'])}○${pick([...'수민준호영진현우석훈'])}`

// ── 시나리오 구성 (기획서 13장 케이스 A~J) ───────────────────
const plan = []
const add = (n, stage, scenario = 'CLEAR', extra = {}) => {
  for (let i = 0; i < n; i++) plan.push({ stage, scenario, ...extra })
}

// 매입 단계
add(1, 'PURCHASE_REGISTERED')
add(1, 'PURCHASE_REGISTERED', 'H5_NO_ID')
add(1, 'HANDED_OVER')
add(1, 'HANDED_OVER', 'S1_SUBMITTED')
add(6, 'PURCHASE_CONFIRMED')

// 수출 검증 대상 150대 — 정상 115 / 보완 28 / 차단 7
const exportGroup = []
const addE = (n, scenario, extra = {}) => {
  for (let i = 0; i < n; i++) exportGroup.push({ stage: 'SALE_REGISTERED', scenario, ...extra })
}
addE(115, 'CLEAR')
addE(1, 'S1_DEALER', { release: 'PENDING', requester: 'U-SAL2', reason: '바이어 선적 일정(10/4 출항) 고정, 세금계산서는 딜러 발행 지연 중' })
addE(1, 'S1_DEALER', { release: 'APPROVED', requester: 'U-SAL2', reason: '딜러 측 전자세금계산서 발행 오류로 재발행 대기' })
addE(4, 'S1_DEALER')
addE(5, 'S1_INDIV_CASH')
addE(3, 'S4_REPEAT')
// 역마진(S5)은 판단 항목 — 조건부 선적이 아니라 영업이 사유를 남기고 회계가 확인한다
addE(1, 'S5_LOSS', { lossNote: true, requester: 'U-SAL2', reason: '장기 재고(60일) 처분, 추가 시세 하락 전 판매' })
addE(2, 'S5_LOSS')
addE(2, 'S2_RECEIPT')
addE(2, 'S3_AMOUNT')
addE(4, 'S6_BROKER')
addE(1, 'S7_PLATE')
addE(2, 'S1_SUBMITTED')
addE(2, 'H1_SEIZURE')
addE(1, 'H2_THEFT')
addE(2, 'H6_VIN')
addE(2, 'H3_EXPIRED')
plan.push(...shuffle(exportGroup))

// 선적 전표
add(20, 'IN_SLIP', 'CLEAR', { slip: 'S-PENDING' })
add(8, 'IN_SLIP', 'CLEAR', { slip: 'S-APPROVED' })
add(1, 'IN_SLIP', 'NEW_SEIZURE', { slip: 'S-APPROVED' })
add(1, 'IN_SLIP', 'H7_FILED', { slip: 'S-APPROVED' })

// 선적 완료 — 사후 보완 중 3 (기한 초과 2) / 종결 7
add(2, 'SHIPPED', 'S1_DEALER', { slip: 'S-SHIPPED', release: 'APPROVED', requester: 'U-SAL1', due: ymd(9, 27), reason: '바이어 L/C 만기 임박, 세금계산서 사후 수취 예정' })
add(1, 'SHIPPED', 'S1_DEALER', { slip: 'S-SHIPPED', release: 'APPROVED', requester: 'U-SAL2', due: ymd(9, 30), reason: '딜러 세금계산서 월말 일괄 발행' })
add(7, 'CLOSED', 'CLEAR', { slip: 'S-SHIPPED' })

// ── 생성 ────────────────────────────────────────────────────
const STAGES = ['PURCHASE_REGISTERED', 'HANDED_OVER', 'PURCHASE_CONFIRMED', 'SALE_REGISTERED', 'IN_SLIP', 'SHIPPED', 'CLOSED']
const vehicles = []
const purchases = []
const evidences = []
const sales = []
const exportDecls = []
const releases = []
const auditLogs = []
const vinRegistry = []
const scenarioById = {}
const slipVehicles = { 'S-PENDING': [], 'S-APPROVED': [], 'S-SHIPPED': [] }

let evSeq = 0
let logSeq = 0
let relSeq = 0
let indSeq = 0
const log = (entry) => auditLogs.push({ id: `L${pad(++logSeq, 5)}`, ...entry })

const typeFor = (scenario) => {
  if (['S1_DEALER', 'S2_RECEIPT', 'S3_AMOUNT', 'S1_SUBMITTED'].includes(scenario)) return 'DEALER'
  if (['S1_INDIV_CASH', 'S4_REPEAT', 'H5_NO_ID'].includes(scenario)) return 'INDIVIDUAL'
  const r = rand()
  return r < 0.5 ? 'DEALER' : r < 0.75 ? 'AUCTION' : 'INDIVIDUAL'
}

const FILE = {
  TAX_INVOICE: 'tax-invoice',
  SIMPLE_RECEIPT: 'receipt',
  CONTRACT: 'contract',
  AUCTION_CONFIRMATION: 'auction-confirm',
  ID_COPY: 'id-copy',
  TRANSFER_RECEIPT: 'bank-transfer',
  OWNERSHIP_TRANSFER: 'ownership-transfer',
}

plan.forEach((p, i) => {
  const idx = i + 1
  const id = `V${pad(idx)}`
  const m = pick(MODELS)
  const stageIdx = STAGES.indexOf(p.stage)
  const type = typeFor(p.scenario)
  const vin = makeVin(m.prefix)
  const plateNumber = makePlate()

  // 날짜 흐름
  const pDay =
    stageIdx <= 1 ? int(27, 28) : stageIdx === 2 ? int(23, 27) : stageIdx >= 5 ? int(5, 13) : int(8, 25)
  const sDay = stageIdx >= 5 ? Math.min(pDay + int(1, 3), 16) : Math.min(pDay + int(1, 3), 28)

  // 매입처
  let vendorId
  if (type === 'DEALER') vendorId = pick(dealers).id
  else if (type === 'AUCTION') vendorId = pick(auctions).id
  else if (p.scenario === 'S4_REPEAT') vendorId = 'I-REPEAT'
  else {
    vendorId = `I${pad(++indSeq)}`
    vendors.push({ id: vendorId, name: makeName(), type: 'INDIVIDUAL' })
  }

  const amount = int(m.price[0] * 10, m.price[1] * 10) * 100000
  const paymentMethod = p.scenario === 'S1_INDIV_CASH' ? 'CASH' : 'BANK_TRANSFER'
  const purchaseDate = ymd(9, pDay)

  const purchase = { vehicleId: id, vendorId, purchaseType: type, amount, paymentMethod, purchaseDate, purchaserId: 'U-PUR' }
  if (stageIdx >= 1) {
    purchase.handover = { receiverId: 'U-PUR', plateChecked: true, photoCount: 4, at: at(9, Math.min(pDay + 1, 28), 10) }
  }
  purchases.push(purchase)

  log({ vehicleId: id, action: '매입 등록', actorId: 'U-PUR', at: at(9, pDay, 9), nextStage: 'PURCHASE_REGISTERED' })

  // 증빙
  let kinds = [...policy.requiredEvidence[type]]
  if (p.scenario === 'S1_DEALER') kinds = kinds.filter((k) => k !== 'TAX_INVOICE')
  if (p.scenario === 'S1_INDIV_CASH') kinds = kinds.filter((k) => k !== 'TRANSFER_RECEIPT')
  if (p.scenario === 'H5_NO_ID') kinds = kinds.filter((k) => k !== 'ID_COPY')
  if (p.scenario === 'S2_RECEIPT') kinds = kinds.map((k) => (k === 'TAX_INVOICE' ? 'SIMPLE_RECEIPT' : k))
  const earlyStage = stageIdx === 0 || (stageIdx === 1 && p.scenario === 'S1_SUBMITTED')
  kinds.forEach((kind) => {
    const pendingInvoice = p.scenario === 'S1_SUBMITTED' && kind === 'TAX_INVOICE'
    const status = earlyStage || pendingInvoice ? 'SUBMITTED' : 'VERIFIED'
    const ev = {
      id: `E${pad(++evSeq, 4)}`,
      vehicleId: id,
      kind,
      fileName: `${FILE[kind]}_${id}.pdf`,
      uploadedBy: 'U-PUR',
      uploadedAt: at(9, pDay, 9),
      status,
    }
    if (kind === 'TAX_INVOICE' || kind === 'SIMPLE_RECEIPT') ev.amount = p.scenario === 'S3_AMOUNT' ? amount - 500000 : amount
    if (status === 'VERIFIED') {
      ev.verifiedBy = 'U-ACC'
      ev.verifiedAt = at(9, Math.min(pDay + 1, 28), 16)
    }
    evidences.push(ev)
  })
  if (!earlyStage && kinds.length) {
    log({ vehicleId: id, action: '증빙 검증', actorId: 'U-ACC', at: at(9, Math.min(pDay + 1, 28), 16), reason: `증빙 ${kinds.length}건 확인` })
  }

  // VIN 조회 스냅샷
  let checkDay = stageIdx >= 3 ? int(23, 28) : pDay
  if (stageIdx >= 5) checkDay = 19
  const vinCheck = { checkedAt: at(9, checkDay, 11), seizure: false, lien: false, theft: false }
  if (p.scenario === 'H3_EXPIRED') vinCheck.checkedAt = at(9, int(12, 15), 11)
  if (p.scenario === 'H1_SEIZURE') {
    vinCheck.seizure = true
    vinRegistry.push({ vin, seizure: true, lien: false, theft: false, note: '지방세 체납 압류 (매입 후 등록)' })
  }
  if (p.scenario === 'H2_THEFT') {
    vinCheck.theft = true
    vinRegistry.push({ vin, seizure: false, lien: false, theft: true, note: '도난 신고 접수 차량' })
  }
  if (p.scenario === 'NEW_SEIZURE') {
    vinRegistry.push({ vin, seizure: true, lien: false, theft: false, note: '과태료 체납 압류 (9/28 신규 등록)' })
  }

  if (stageIdx >= 1) {
    log({ vehicleId: id, action: '인수 완료', actorId: 'U-PUR', at: purchase.handover.at, prevStage: 'PURCHASE_REGISTERED', nextStage: 'HANDED_OVER', reason: '차량번호 확인 · 외관 사진 4장' })
  }
  if (stageIdx >= 2) {
    log({ vehicleId: id, action: '매입 확정', actorId: 'U-PUR', at: at(9, Math.min(pDay + 1, 28), 17), prevStage: 'HANDED_OVER', nextStage: 'PURCHASE_CONFIRMED' })
  }

  // 판매·수출신고
  const salesPersonId = p.requester ?? pick(['U-SAL1', 'U-SAL2'])
  if (stageIdx >= 3) {
    const buyer = pick(buyers)
    const uplift = p.scenario === 'S5_LOSS' ? 0.86 : 1.08 + rand() * 0.14
    const exchangeRate = rates.USD + int(-8, 8)
    sales.push({
      vehicleId: id,
      salesNo: `SO-2609-${pad(idx)}`,
      buyerId: buyer.id,
      exportCountry: buyer.country,
      amount: Math.round((amount * uplift) / exchangeRate / 10) * 10,
      currency: 'USD',
      exchangeRate,
      // 선적 완료 차량: 영세율 과세표준용 선적일(9/20) 기준환율 (난수 순서를 바꾸지 않도록 고정값)
      ...(stageIdx >= 5 ? { shipmentRate: rates.USD + 5 } : {}),
      incoterms: pick(['FOB', 'FOB', 'FOB', 'CIF']),
      taxTreatment: 'ZERO_RATED',
      customsBroker: p.scenario === 'S6_BROKER' ? undefined : pick(brokers),
      expectedShipmentDate: stageIdx >= 5 ? ymd(9, 20) : ymd(10, int(3, 15)),
      salesDate: ymd(9, sDay),
      salesPersonId,
    })
    log({ vehicleId: id, action: '판매 등록', actorId: salesPersonId, at: at(9, sDay, 14), prevStage: 'PURCHASE_CONFIRMED', nextStage: 'SALE_REGISTERED', reason: `${buyer.name} (${buyer.country})` })

    const extracted = { vin, plateNumber }
    if (p.scenario === 'H6_VIN') extracted.vin = vin.slice(0, 16) + (vin[16] === '7' ? '1' : '7')
    if (p.scenario === 'S7_PLATE') extracted.plateNumber = plateNumber.slice(0, -1) + ((Number(plateNumber.slice(-1)) + 1) % 10)
    exportDecls.push({
      vehicleId: id,
      declNo: `EX-2609-${pad(idx, 4)}`,
      status: p.scenario === 'H7_FILED' ? 'FILED' : 'ACCEPTED',
      extracted,
    })
    if (checkDay > sDay) {
      log({ vehicleId: id, action: 'VIN 재조회', actorId: 'U-LOG', at: at(9, checkDay, 11), reason: vinCheck.seizure ? '압류 등록 확인' : vinCheck.theft ? '도난 신고 확인' : '이상 없음' })
    }
  }

  // 선적 전 요청은 최근(9/27~28), 선적 완료 건은 선적 직전에 요청된 것으로 둔다
  const reqDay = p.release || p.lossNote ? (stageIdx >= 5 ? Math.min(sDay + 1, 17) : int(27, 28)) : 0

  // 역마진(S5)은 조건부 선적 대상이 아니다 — 영업이 사유를 남기고 회계 확인을 기다린다
  if (p.lossNote) {
    log({ vehicleId: id, action: '회계 확인 요청 · 역마진 사유', actorId: p.requester, at: at(9, reqDay, 15), reason: p.reason })
  }

  // 조건부 선적 — 서류로 사후 보완하는 항목(S1)만
  if (p.release) {
    const gateCodes = ['S1']
    const release = {
      id: `R${pad(++relSeq)}`,
      vehicleId: id,
      gateCodes,
      dueDate: p.due ?? addDays(ymd(9, reqDay), policy.conditionalDueDays),
      ownerId: p.requester,
      requestedBy: p.requester,
      requestedAt: at(9, reqDay, 15),
      reason: p.reason,
      vatImpact: gateCodes.includes('S1') ? Math.round((amount * 10) / 110) : 0,
      status: p.release,
    }
    log({ vehicleId: id, action: '조건부 선적 요청', actorId: p.requester, at: release.requestedAt, reason: p.reason })
    if (p.release === 'APPROVED') {
      release.decidedBy = 'U-ACC'
      release.decidedAt = at(9, reqDay, 17)
      release.decisionNote = `보완 기한 ${release.dueDate.replaceAll('-', '.')} 엄수`
      log({ vehicleId: id, action: '조건부 선적 승인', actorId: 'U-ACC', at: release.decidedAt, reason: release.decisionNote })
    }
    releases.push(release)
  }

  if (p.slip) slipVehicles[p.slip].push(id)

  vehicles.push({
    id,
    vin,
    plateNumber,
    manufacturer: m.maker,
    model: m.model,
    modelYear: int(2016, 2023),
    mileage: int(3, 18) * 10000 + int(0, 9999),
    stage: p.stage,
    vinCheck,
    ...(p.slip && { shipmentId: p.slip }),
  })
  scenarioById[id] = p.scenario
})

// ── 선적 전표 ────────────────────────────────────────────────
const shipments = [
  {
    id: 'S-SHIPPED',
    slipNo: 'SP-260920-01',
    vessel: 'K-GLORY',
    voyage: '2609E',
    departurePort: '인천항',
    arrivalPort: '아카바항',
    container: 'RoRo',
    scheduledDeparture: ymd(9, 20),
    vehicleIds: slipVehicles['S-SHIPPED'],
    status: 'SHIPPED',
    createdBy: 'U-SAL1',
    createdAt: at(9, 17, 10),
    decidedBy: 'U-ACC',
    decidedAt: at(9, 18, 11),
    shippedAt: at(9, 20, 15),
  },
  {
    id: 'S-APPROVED',
    slipNo: 'SP-260927-01',
    vessel: 'OCEAN BRIDGE',
    voyage: '2610E',
    departurePort: '인천항',
    arrivalPort: '메르신항',
    container: 'RoRo',
    scheduledDeparture: ymd(10, 1),
    vehicleIds: slipVehicles['S-APPROVED'],
    status: 'APPROVED',
    createdBy: 'U-SAL2',
    createdAt: at(9, 27, 10),
    decidedBy: 'U-ACC',
    decidedAt: at(9, 28, 9),
  },
  {
    id: 'S-PENDING',
    slipNo: 'SP-260928-01',
    vessel: 'SEA PIONEER',
    voyage: '2610W',
    departurePort: '평택항',
    arrivalPort: '제벨알리항',
    container: 'RoRo',
    scheduledDeparture: ymd(10, 4),
    vehicleIds: slipVehicles['S-PENDING'],
    status: 'PENDING',
    createdBy: 'U-SAL1',
    createdAt: at(9, 28, 17, 20),
  },
]

for (const s of shipments) {
  for (const vehicleId of s.vehicleIds) {
    log({ vehicleId, shipmentId: s.id, action: '선적 전표 편입 · 결재 요청', actorId: s.createdBy, at: s.createdAt, prevStage: 'SALE_REGISTERED', nextStage: 'IN_SLIP', reason: s.slipNo })
    if (s.decidedAt) log({ vehicleId, shipmentId: s.id, action: '선적 전표 결재 승인', actorId: 'U-ACC', at: s.decidedAt, reason: s.slipNo })
    if (s.shippedAt) {
      const v = vehicles.find((x) => x.id === vehicleId)
      log({ vehicleId, shipmentId: s.id, action: '선적 완료', actorId: 'U-LOG', at: s.shippedAt, prevStage: 'IN_SLIP', nextStage: v.stage === 'CLOSED' ? 'CLOSED' : 'SHIPPED', reason: `${s.vessel} ${s.voyage}` })
    }
  }
}

// 매입 등록 화면 시연용 VIN
vinRegistry.push(
  { vin: 'KMHE341DBNA000147', seizure: true, lien: true, theft: false, note: '자동차세 체납 압류 · 캐피탈 저당' },
  { vin: 'KNAGM4AD5K5000923', seizure: false, lien: false, theft: true, note: '도난 신고 접수 차량' },
)

auditLogs.sort((a, b) => a.at.localeCompare(b.at))

// ── 알림 이력 (최근 이벤트) ──────────────────────────────────
const notifications = []
let notiSeq = 0
const won = (n) => `${n < 0 ? '-' : ''}₩${Math.abs(Math.round(n)).toLocaleString('ko-KR')}`
const dot = (date) => date.slice(0, 10).replaceAll('-', '.')
const vehicleOf = (id) => vehicles.find((v) => v.id === id)
const notify = (n) => notifications.push({ id: `N${pad(++notiSeq)}`, readBy: [], userIds: [], ...n })

for (const r of releases) {
  const v = vehicleOf(r.vehicleId)
  if (r.status === 'PENDING') {
    notify({ at: r.requestedAt, severity: 'warning', title: '조건부 선적 결재 요청', message: `${v.plateNumber} · ${r.gateCodes.join('·')} · 보완 기한 ${dot(r.dueDate)}`, link: '/shipments?tab=releases', roles: ['ACCOUNTING'], actorId: r.requestedBy, vehicleId: v.id })
  } else if (v.stage === 'SHIPPED' && r.dueDate < '2026-09-29') {
    notify({ at: `${addDays(r.dueDate, 1)}T09:00`, severity: 'error', title: '사후 증빙 기한 초과', message: `${v.plateNumber} · 보완 기한 ${dot(r.dueDate)} 경과 · 신규 조건부 선적 요청 제한`, link: `/vehicles/${v.id}`, roles: ['ACCOUNTING'], userIds: [r.ownerId], actorId: 'SYSTEM', vehicleId: v.id })
  } else if (v.stage === 'SHIPPED') {
    notify({ at: '2026-09-28T09:00', severity: 'warning', title: '사후 증빙 기한 임박', message: `${v.plateNumber} · 보완 기한 ${dot(r.dueDate)}`, link: `/vehicles/${v.id}`, roles: [], userIds: [r.ownerId], actorId: 'SYSTEM', vehicleId: v.id })
  }
}

for (const s of shipments) {
  if (s.status === 'PENDING')
    notify({ at: s.createdAt, severity: 'info', title: '선적 전표 결재 요청', message: `${s.slipNo} · ${s.vehicleIds.length}대 · ${s.vessel} ${s.voyage}`, link: `/shipments?id=${s.id}`, roles: ['ACCOUNTING'], actorId: s.createdBy })
  if (s.status === 'APPROVED')
    notify({ at: s.decidedAt, severity: 'success', title: '선적 처리 요청', message: `${s.slipNo} 결재 승인 · 출항 ${dot(s.scheduledDeparture)}`, link: `/shipments?id=${s.id}`, roles: ['LOGISTICS'], userIds: [s.createdBy], actorId: 'U-ACC' })
}

for (const v of vehicles) {
  const sc = scenarioById[v.id]
  const p = purchases.find((x) => x.vehicleId === v.id)
  const s = sales.find((x) => x.vehicleId === v.id)
  if (sc === 'H1_SEIZURE' || sc === 'H2_THEFT') {
    const rec = vinRegistry.find((r) => r.vin === v.vin)
    notify({ at: v.vinCheck.checkedAt, severity: 'error', title: sc === 'H2_THEFT' ? '도난 신고 차량 확인' : 'VIN 재조회 압류 확인', message: `${v.plateNumber} · ${rec.note} · 선적 차단`, link: `/vehicles/${v.id}`, roles: ['ACCOUNTING', 'SALES'], actorId: 'U-LOG', vehicleId: v.id })
  }
  if (sc === 'H6_VIN')
    notify({ at: `${s.salesDate}T16:10`, severity: 'error', title: '수출신고필증 VIN 불일치', message: `${v.plateNumber} · 신고필증과 전산 VIN이 다릅니다`, link: `/vehicles/${v.id}`, roles: ['LOGISTICS', 'ACCOUNTING'], actorId: 'SYSTEM', vehicleId: v.id })
  if (sc === 'S5_LOSS') {
    const margin = s.amount * s.exchangeRate - p.amount
    notify({ at: `${s.salesDate}T14:30`, severity: 'warning', title: '매입·매출 언밸런스 · 역마진', message: `${v.plateNumber} · 역마진 ${won(margin)}`, link: `/vehicles/${v.id}`, roles: ['ACCOUNTING'], actorId: s.salesPersonId, vehicleId: v.id })
  }
  if (sc === 'S2_RECEIPT' || sc === 'S3_AMOUNT') {
    // 크로스체크 알림 분류: 증빙 유형 불일치(S2)는 거래 유형 불일치, 금액 불일치(S3)는 매입 증빙 미확보
    const title = sc === 'S2_RECEIPT' ? '거래 유형 불일치' : '매입 증빙 미확보'
    const label = sc === 'S2_RECEIPT' ? '딜러 매입인데 간이영수증만 수취' : '세금계산서 금액 불일치'
    notify({ at: `${s.salesDate}T14:30`, severity: 'warning', title, message: `${v.plateNumber} · ${label} · 증빙 미확보 예상 금액 ${won(sc === 'S2_RECEIPT' ? (p.amount * 10) / 110 : (500000 * 10) / 110)}`, link: `/vehicles/${v.id}`, roles: ['ACCOUNTING'], actorId: s.salesPersonId, vehicleId: v.id })
  }
}

// 9/27 이전 알림은 이미 확인한 것으로
for (const n of notifications) if (n.at < '2026-09-27') n.readBy = users.map((u) => u.id)
notifications.sort((a, b) => a.at.localeCompare(b.at))

// ── 저장 ────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true })
const save = (name, data) => writeFileSync(`${OUT}${name}.json`, JSON.stringify(data, null, 2) + '\n')
save('masters', { users, vendors, buyers, brokers, rates })
save('policy', policy)
save('vehicles', vehicles)
save('purchases', purchases)
save('evidences', evidences)
save('vinRegistry', vinRegistry)
save('sales', sales)
save('exportDeclarations', exportDecls)
save('shipments', shipments)
save('conditionalReleases', releases)
save('auditLogs', auditLogs)
save('notifications', notifications)

const count = (stage) => vehicles.filter((v) => v.stage === stage).length
console.log(`vehicles ${vehicles.length}`, Object.fromEntries(STAGES.map((s) => [s, count(s)])))

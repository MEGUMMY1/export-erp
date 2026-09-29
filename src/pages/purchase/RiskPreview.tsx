import { CheckList, Verdict, type CheckItem, type CheckStatus } from '@/components/domain/CheckList'
import { Panel } from '@/components/domain/Panel'
import { CONFIRM_BLOCKERS } from '@/domain/constants'
import { formatDateTime, formatKRW } from '@/domain/format'
import type { GateCode, GateResult, PurchaseType, VinCheck } from '@/domain/types'
import type { VatSummary } from '@/domain/vat'

interface Props {
  vinValid: boolean
  vinCheck?: VinCheck & { note?: string }
  gates: GateResult[]
  vat: VatSummary
  purchaseType: PurchaseType
  vendorSelected: boolean
  hasAmount: boolean
  missingVatEvidence: boolean
  /** 미입력 필수 항목 수 */
  missingFields: number
}

/** 체크리스트가 직접 다루는 게이트 — 나머지는 아래에 따로 표시 */
const COVERED: GateCode[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'S1', 'S2', 'S3']

/** 등록 전 판정 — "등록할 수 있는가, 확정할 수 있는가"를 먼저 답한다 */
export function RiskPreview({ vinValid, vinCheck, gates, vat, purchaseType, vendorSelected, hasAmount, missingVatEvidence, missingFields }: Props) {
  const gate = (code: GateCode) => gates.find((g) => g.code === code)
  const vinBlocked = !!vinCheck && (vinCheck.theft || vinCheck.seizure || vinCheck.lien)
  const confirmBlockers = gates.filter((g) => CONFIRM_BLOCKERS.includes(g.code))

  // ── 결론 ──
  const verdict: { status: CheckStatus; title: string; note?: string } = vinBlocked
    ? {
        status: 'error',
        title: vinCheck?.theft ? '매입 등록 불가 — 도난 신고 차량' : '매입 등록 불가 — 압류·저당 차량',
        note: vinCheck?.theft ? '거래를 중단해야 합니다.' : '해제가 확인된 뒤 다시 조회해 등록할 수 있습니다.',
      }
    : missingFields > 0
      ? { status: 'pending', title: '필수 항목 입력 중', note: '입력하는 대로 아래 항목을 판정합니다.' }
      : confirmBlockers.length
        ? {
            status: 'warn',
            title: '등록 가능 · 매입 확정 불가',
            note: `${confirmBlockers.map((g) => g.title).join(', ')} — 해소 후 확정할 수 있습니다.`,
          }
        : {
            status: 'ok',
            title: '등록 후 바로 매입 확정 가능',
            note: gates.length ? '보완 항목은 매입 이후에도 추적됩니다.' : undefined,
          }

  // ── 항목별 ──
  const s1 = gate('S1') ?? gate('S2')
  const items: CheckItem[] = [
    !vinValid || !vinCheck
      ? { key: 'vin', status: 'pending', title: 'VIN 압류·도난 조회', result: '17자리 입력 시 자동 조회' }
      : vinCheck.theft
        ? { key: 'vin', status: 'error', title: 'VIN 압류·도난 조회', result: '도난 신고 차량', note: vinCheck.note }
        : vinCheck.seizure || vinCheck.lien
          ? { key: 'vin', status: 'error', title: 'VIN 압류·도난 조회', result: '압류·저당 등록', note: vinCheck.note }
          : { key: 'vin', status: 'ok', title: 'VIN 압류·도난 조회', result: '이상 없음', note: `조회 ${formatDateTime(vinCheck.checkedAt)}` },

    gate('H4')
      ? { key: 'handover', status: 'pending', title: '실물 인수', result: '인수 전', note: '차량번호 확인과 외관 사진이 있어야 매입을 확정할 수 있습니다.' }
      : { key: 'handover', status: 'ok', title: '실물 인수', result: '확인 완료' },

    gate('H5')
      ? { key: 'identity', status: 'error', title: '매도인 신원', result: purchaseType === 'INDIVIDUAL' ? '신분증 사본 없음' : '사업자등록번호 없음', note: '장물 여부를 확인할 수 없어 매입 확정이 막힙니다.' }
      : !vendorSelected
        ? { key: 'identity', status: 'pending', title: '매도인 신원', result: purchaseType === 'INDIVIDUAL' ? '매도인 입력 전' : '매입처 선택 전' }
        : { key: 'identity', status: 'ok', title: '매도인 신원', result: purchaseType === 'INDIVIDUAL' ? '신분증 사본 제출' : '사업자 확인' },

    !s1
      ? { key: 'evidence', status: 'ok', title: '매입 증빙', result: '필수 증빙 제출 완료' }
      : s1.reason.startsWith('제출됨')
        ? { key: 'evidence', status: 'ok', title: '매입 증빙', result: '필수 증빙 제출 완료', note: '등록 후 회계 검증을 거칩니다.' }
        : { key: 'evidence', status: 'warn', title: '매입 증빙', result: s1.reason.replace(/^미수취: /, '미제출: '), note: '매입 이후에도 보완할 수 있지만, 그 전까지 매입세액은 공제되지 않습니다.' },

    !hasAmount
      ? { key: 'vat', status: 'pending', title: '매입세액', result: '매입가 입력 대기' }
      : missingVatEvidence
        ? { key: 'vat', status: 'warn', title: '매입세액', result: `증빙 미확보 예상 금액 ${formatKRW(vat.expected)}`, note: '공제 요건 증빙이 제출되지 않았습니다.' }
        : { key: 'vat', status: 'ok', title: '매입세액', result: `${formatKRW(vat.expected)} 확보 가능 예상`, note: '회계 검증 후 확보됩니다.' },

    ...gates
      .filter((g) => !COVERED.includes(g.code))
      .map<CheckItem>((g) => ({ key: g.code, status: g.severity === 'HARD' ? 'error' : 'warn', title: `[${g.code}] ${g.title}`, result: '확인 필요', note: g.reason })),
  ]

  return (
    <Panel title="등록 전 판정">
      <Verdict {...verdict} />
      <CheckList items={items} />
    </Panel>
  )
}

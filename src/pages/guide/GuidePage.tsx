import { useSearchParams } from 'react-router'
import { Field, Panel } from '@/components/domain/Panel'
import { usePageTitle } from '@/components/layout/pageTitle'
import { Chip, Tabs } from '@/components/ui'
import { EVIDENCE_LABEL, GATE_META, PURCHASE_TYPE_LABEL, ROLE_LABEL, STAGES, STAGE_LABEL } from '@/domain/constants'
import { formatDate } from '@/domain/format'
import { can, type Permission } from '@/domain/rules'
import type { GateCode, PurchaseType, Role, Stage } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useData } from '@/store'
import { EXPORT_CHECKS, GATE_GUIDE } from './gateGuide'

type Tab = 'gates' | 'policy' | 'flow'

const HARD: GateCode[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']
const SOFT: GateCode[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
const ROLES: Role[] = ['PURCHASER', 'SALES', 'ACCOUNTING', 'LOGISTICS']

const STAGE_RULE: Record<Stage, string> = {
  PURCHASE_REGISTERED: 'VIN 즉시 조회 · 증빙 제출 (압류·저당·도난 차량은 등록 불가)',
  HANDED_OVER: '인수자 · 차량번호 · 외관 사진 확인 (압류·저당·도난 차량은 인수 불가)',
  PURCHASE_CONFIRMED: 'H1~H5 없음 (압류·도난·조회 만료·인수·신원)',
  SALE_REGISTERED: '매입 확정 차량만 · 압류·도난 차량과 부가세 이중 손실(무증빙 매입 + 국내 판매)은 등록 불가 · 수출 검증 시작',
  IN_SLIP: '차단 없음 + 보완 항목은 조건부 선적 승인 → 전표 결재',
  SHIPPED: '전표 결재 승인 + 선적 직전 VIN 재조회·재판정 통과 (전표 결재는 차량별 선적 가능 상태를 전제로 한 승인 — 차단 또는 승인되지 않은 보완 항목이 생긴 차량은 승인 효력이 취소되어 자동 제외)',
  CLOSED: '사후 보완 항목까지 모두 해소',
}

const PERMISSION_LABEL: Record<Permission, string> = {
  REGISTER_PURCHASE: '매입 등록',
  HANDOVER: '실물 인수',
  CONFIRM_PURCHASE: '매입 확정',
  UPLOAD_EVIDENCE: '증빙 제출',
  VERIFY_EVIDENCE: '증빙 검증',
  ACKNOWLEDGE_GATE: '회계 확인 (S4·S5·S8)',
  REGISTER_SALE: '판매 등록',
  REQUEST_RELEASE: '조건부 선적 요청',
  DECIDE_RELEASE: '조건부 선적 결재',
  CREATE_SLIP: '선적 전표 생성',
  DECIDE_SLIP: '선적 전표 결재',
  PROCESS_SHIPMENT: '선적 처리',
  FIX_EXPORT: '통관 정보·신고필증 보완',
  RECHECK_VIN: 'VIN 재조회',
}

function GateTable({ codes }: { codes: GateCode[] }) {
  const { policy } = useData()
  return (
    <table className="w-full table-fixed text-left">
      <colgroup>
        <col className="w-52" />
        <col className="w-52" />
        <col />
        <col className="w-56" />
        <col className="w-16" />
      </colgroup>
      <thead className="border-y border-gray-20 text-label-md text-gray-70">
        <tr>
          <th className="py-2.5">코드</th>
          <th className="py-2.5">판정 시점</th>
          <th className="py-2.5">판정 조건 · 이유</th>
          <th className="py-2.5">해소 방법</th>
          <th className="py-2.5">담당</th>
        </tr>
      </thead>
      <tbody>
        {codes.map((code) => {
          const meta = GATE_META[code]
          const g = GATE_GUIDE[code]
          return (
            <tr key={code} id={code} className="scroll-mt-24 border-b border-gray-20 align-top">
              <td className={cn('py-3 pr-3 text-body-md-m', meta.severity === 'HARD' ? 'text-red-60' : 'text-orange-60')}>
                [{code}] {meta.title}
              </td>
              <td className="py-3 pr-3 text-body-sm text-gray-80">{g.when}</td>
              <td className="py-3 pr-3">
                <p className="text-body-sm text-gray-90">{g.condition(policy)}</p>
                <p className="text-caption-md text-gray-70">{g.why}</p>
              </td>
              <td className="py-3 pr-3 text-body-sm text-gray-80">{g.resolve}</td>
              <td className="py-3 text-body-sm text-gray-80">{ROLE_LABEL[meta.ownerRole]}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function GuidePage() {
  usePageTitle('판정 기준', '게이트 코드, 회사 정책값, 업무 단계를 설명합니다.')
  const { policy } = useData()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'gates'

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'gates' ? {} : { tab: v }, { replace: true })}
        items={[
          { value: 'gates', label: '게이트 코드' },
          { value: 'policy', label: '정책 · 증빙 기준' },
          { value: 'flow', label: '업무 단계 · 권한' },
        ]}
      />

      {tab === 'gates' && (
        <>
          <Panel title="판정 원리">
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <Chip tone="error">차단</Chip>
                <p className="text-body-md text-gray-80">
                  <b className="text-gray-90">Hard Gate</b> — 법적·장물 리스크. 해소 전에는 다음 단계로 갈 수 없고, 어떤 승인으로도 우회할 수 없습니다.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <Chip tone="warning">보완</Chip>
                <p className="text-body-md text-gray-80">
                  <b className="text-gray-90">Soft Gate</b> — 증빙·서류 리스크. 원칙은 선적 전 보완입니다. 사후 보완이 가능한 항목은 회사 정책에 따라 조건부 선적 대상으로 분리하며,
                  회계 책임자의 명시적 승인과 기한·책임자 지정 없이는 진행할 수 없습니다.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <Chip tone="success">정상</Chip>
                <p className="text-body-md text-gray-80">걸리는 항목이 없습니다. 선적 전표 단위로 일괄 승인됩니다.</p>
              </li>
            </ul>
          </Panel>
          <Panel title="수출 검증 정상 조건">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-52" />
                <col />
                <col className="w-72" />
              </colgroup>
              <thead className="border-y border-gray-20 text-label-md text-gray-70">
                <tr>
                  <th className="py-2.5">검증 항목</th>
                  <th className="py-2.5">정상 조건</th>
                  <th className="py-2.5">실패 시</th>
                </tr>
              </thead>
              <tbody>
                {EXPORT_CHECKS.map((c) => (
                  <tr key={c.item} className="border-b border-gray-20 align-top">
                    <td className="py-3 pr-3 text-body-md-m">{c.item}</td>
                    <td className="py-3 pr-3 text-body-sm text-gray-80">{c.pass}</td>
                    <td className="py-3 text-body-sm">
                      {c.codes.map((code) => (
                        <span key={code} className={cn('block', GATE_META[code].severity === 'HARD' ? 'text-red-60' : 'text-orange-60')}>
                          [{code}] {GATE_META[code].title}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-body-md text-gray-80">
              <b className="text-gray-90">차단 항목이 없고 보완 항목이 모두 해소되면 수출 검증 정상</b>입니다. 보완 항목이 남은 차량은 조건부 선적 승인이 모든 보완 항목을 포함할 때만 전표에 담을 수 있습니다.
            </p>
          </Panel>
          <Panel title="차단 — Hard Gate" actions={<span className="text-caption-md text-gray-70">{HARD.length}개</span>}>
            <GateTable codes={HARD} />
          </Panel>
          <Panel title="보완 — Soft Gate" actions={<span className="text-caption-md text-gray-70">{SOFT.length}개</span>}>
            <GateTable codes={SOFT} />
          </Panel>
        </>
      )}

      {tab === 'policy' && (
        <>
          <Panel title="회사 정책값">
            <dl className="grid grid-cols-3 gap-5">
              <Field label="조건부 선적 보완 기한">최대 {policy.conditionalDueDays}일 (단축만 가능)</Field>
              <Field label="담당자별 미해소 조건부 선적 한도">{policy.perUserOpenLimit}건</Field>
              <Field label="기한 초과 시">해당 담당자의 신규 조건부 선적 요청 제한</Field>
              <Field label="VIN 조회 유효기간">{policy.vinCheckValidDays}일 (경과 시 H3)</Field>
              <Field label="개인 반복 매도인 기준">같은 매도인 월 {policy.repeatSellerThreshold}대 이상 (S4)</Field>
              <Field label="부가세 예정신고 마감">{formatDate(policy.vatFilingDeadline)}</Field>
            </dl>
          </Panel>
          <Panel title="매입 유형별 필수 증빙">
            <table className="w-full text-left">
              <thead className="border-y border-gray-20 text-label-md text-gray-70">
                <tr>
                  <th className="py-2.5">매입 유형</th>
                  <th className="py-2.5">필수 증빙</th>
                  <th className="py-2.5">매입세액 공제 요건</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PURCHASE_TYPE_LABEL) as PurchaseType[]).map((t) => (
                  <tr key={t} className="border-b border-gray-20 align-top">
                    <td className="py-3 text-body-md-m">{PURCHASE_TYPE_LABEL[t]}</td>
                    <td className="py-3 text-body-sm">{policy.requiredEvidence[t].map((k) => EVIDENCE_LABEL[k]).join(', ')}</td>
                    <td className="py-3 text-body-sm">
                      {policy.vatEvidence[t].map((k) => EVIDENCE_LABEL[k]).join(', ')}
                      {t === 'INDIVIDUAL' && <span className="block text-caption-md text-gray-70">+ 대금 계좌이체 지급 (회사 기준 — 현금 지급은 미확보로 처리)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="부가세 계산 기준">
            <ul className="flex flex-col gap-2 text-body-md text-gray-80">
              <li>
                <b className="text-gray-90">매입세액 = 매입가(부가세 포함) × 10/110</b> — 딜러·경매는 세금계산서 매입세액, 개인 매입은 중고자동차 매입세액 공제 특례 기준
              </li>
              <li>
                <b className="text-gray-90">확보</b> — 공제 요건 증빙이 모두 <b>회계 검증 완료</b>된 금액 (제출만으로는 확보 아님)
              </li>
              <li>
                <b className="text-gray-90">미확보</b> — 증빙이 없거나 검증 전이라 현재 공제받을 수 없는 금액 = 부가세 손실 위험
              </li>
              <li>
                <b className="text-gray-90">수출(영세율)</b>은 매출세액이 0이므로, 확보한 매입세액이 그대로 환급됩니다. 국내 판매로 처리하면 10% 매출세액이 발생합니다.
              </li>
            </ul>
            <p className="text-caption-md text-gray-70">
              ※ 세법 요건(중고자동차 매입세액 공제 특례의 적용 요건 등)은 세무 자문으로 확정할 영역이며, 시스템은 위 기준을 회사 정책값으로 적용합니다.
            </p>
          </Panel>
        </>
      )}

      {tab === 'flow' && (
        <>
          <Panel title="업무 단계와 전이 조건">
            <ol className="flex flex-col divide-y divide-gray-20">
              {STAGES.map((s, i) => (
                <li key={s} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-60 text-label-sm text-white">{i + 1}</span>
                  <div>
                    <p className="text-body-md-m text-gray-90">{STAGE_LABEL[s]}</p>
                    <p className="text-body-sm text-gray-70">{STAGE_RULE[s]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="역할별 권한">
            <table className="w-full text-left">
              <thead className="border-y border-gray-20 text-label-md text-gray-70">
                <tr>
                  <th className="py-2.5">업무</th>
                  {ROLES.map((r) => (
                    <th key={r} className="py-2.5 text-center">
                      {ROLE_LABEL[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PERMISSION_LABEL) as Permission[]).map((perm) => (
                  <tr key={perm} className="border-b border-gray-20">
                    <td className="py-2.5 text-body-sm">{PERMISSION_LABEL[perm]}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="py-2.5 text-center text-body-md-m text-brand-60">
                        {can(r, perm) ? '●' : <span className="text-gray-40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  )
}

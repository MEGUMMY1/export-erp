import { Panel } from '@/components/domain/Panel'
import { GateLabel, RiskChip } from '@/components/domain/RiskChip'
import { Chip } from '@/components/ui'
import { formatDateTime, formatKRW } from '@/domain/format'
import type { GateResult, Risk, VinCheck } from '@/domain/types'
import type { VatSummary } from '@/domain/vat'
import { vinResultLabel } from '@/domain/vin'

interface Props {
  vinValid: boolean
  vinCheck?: VinCheck & { note?: string }
  gates: GateResult[]
  risk: Risk
  vat: VatSummary
  missingVatEvidence: boolean
}

/** 등록 전 실시간 판정 — 입력하는 순간 무엇이 막히는지 보여준다 */
export function RiskPreview({ vinValid, vinCheck, gates, risk, vat, missingVatEvidence }: Props) {
  const vinHit = vinCheck && (vinCheck.theft || vinCheck.seizure || vinCheck.lien)
  return (
    <Panel title="등록 전 리스크 판정" actions={<RiskChip risk={risk} />}>
      <section className="flex flex-col gap-1.5">
        <p className="text-caption-md text-gray-70">VIN 압류·도난 조회</p>
        {!vinValid || !vinCheck ? (
          <p className="text-body-sm text-gray-50">VIN 17자리를 입력하면 자동으로 조회합니다.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <Chip tone={vinHit ? 'error' : 'success'} className="self-start">
              {vinResultLabel(vinCheck)}
            </Chip>
            {vinCheck.note && <p className="text-body-sm text-red-60">{vinCheck.note}</p>}
            <p className="text-caption-sm text-gray-50">조회 {formatDateTime(vinCheck.checkedAt)}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1.5 border-t border-gray-20 pt-4">
        <p className="text-caption-md text-gray-70">매입세액 (매입가 × 10/110)</p>
        <p className="text-subtitle-lg text-gray-90">{formatKRW(vat.expected)}</p>
        <p className={missingVatEvidence ? 'text-body-sm text-orange-60' : 'text-body-sm text-gray-70'}>
          {missingVatEvidence ? '공제 요건 증빙이 없어 현재로서는 공제받을 수 없습니다.' : '증빙 제출됨 · 회계 검증 후 확보됩니다.'}
        </p>
      </section>

      <section className="flex flex-col gap-2 border-t border-gray-20 pt-4">
        <p className="text-caption-md text-gray-70">게이트 판정 {gates.length > 0 && `· ${gates.length}건`}</p>
        {gates.length === 0 ? (
          <p className="text-body-sm text-green-60">걸리는 항목이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {gates.map((g) => (
              <li key={g.code} className="flex flex-col gap-1">
                <GateLabel gate={g} />
                <p className="text-body-sm text-gray-80">{g.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Panel>
  )
}

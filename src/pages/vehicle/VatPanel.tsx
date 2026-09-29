import { Panel } from '@/components/domain/Panel'
import { formatDate, formatKRW } from '@/domain/format'
import type { Vehicle } from '@/domain/types'
import type { VatSummary } from '@/domain/vat'

/** 매입세액 — 증빙 상태에 따라 회사 정책상 확보 가능한 금액과 증빙 미확보 예상 금액을 나눠 보여준다 */
export function VatPanel({ vat, writeOff }: { vat: VatSummary; writeOff?: Vehicle['writeOff'] }) {
  const ratio = vat.expected ? Math.round((vat.secured / vat.expected) * 100) : 0
  return (
    <Panel title="매입세액 (증빙 기준)">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-caption-md text-gray-70">확보 가능 예상 (정책 기준)</p>
          <p className="text-subtitle-lg text-gray-90">{formatKRW(vat.expected)}</p>
        </div>
        <div>
          <p className="text-caption-md text-gray-70">확보 (회계 검증 완료)</p>
          <p className="text-subtitle-lg text-green-60">{formatKRW(vat.secured)}</p>
        </div>
        <div>
          <p className="text-caption-md text-gray-70">증빙 미확보 예상 금액</p>
          <p className={vat.unsecured > 0 ? 'text-subtitle-lg text-orange-60' : 'text-subtitle-lg text-gray-50'}>{formatKRW(vat.unsecured)}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-20" role="progressbar" aria-valuenow={ratio} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-green-50" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-caption-md text-gray-70">
        {vat.basis}
        {vat.pendingVerification && !writeOff && ' · 증빙은 모두 제출됨, 회계 검증이 끝나면 확보됩니다.'}
      </p>
      {writeOff && (
        <p className="text-body-sm text-red-60">
          불공제 확정 {formatDate(writeOff.at)} · 손실 {formatKRW(writeOff.amount)} — {writeOff.reason}
        </p>
      )}
    </Panel>
  )
}

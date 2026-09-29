import { Panel } from '@/components/domain/Panel'
import { formatKRW } from '@/domain/format'
import type { VatSummary } from '@/domain/vat'

/** 매입세액 — 영세율 수출에서 증빙은 곧 돌려받을 돈 */
export function VatPanel({ vat }: { vat: VatSummary }) {
  const ratio = vat.expected ? Math.round((vat.secured / vat.expected) * 100) : 0
  return (
    <Panel title="매입세액 (부가세 환급 대상)">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-caption-md text-gray-70">공제 대상</p>
          <p className="text-subtitle-lg text-gray-90">{formatKRW(vat.expected)}</p>
        </div>
        <div>
          <p className="text-caption-md text-gray-70">확보 (검증 완료)</p>
          <p className="text-subtitle-lg text-green-60">{formatKRW(vat.secured)}</p>
        </div>
        <div>
          <p className="text-caption-md text-gray-70">미확보</p>
          <p className={vat.unsecured > 0 ? 'text-subtitle-lg text-orange-60' : 'text-subtitle-lg text-gray-50'}>{formatKRW(vat.unsecured)}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-20" role="progressbar" aria-valuenow={ratio} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-green-50" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-caption-md text-gray-70">
        {vat.basis}
        {vat.pendingVerification && ' · 증빙은 모두 제출됨, 회계 검증이 끝나면 확보됩니다.'}
      </p>
    </Panel>
  )
}

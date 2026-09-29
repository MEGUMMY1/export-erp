import { Field, Panel } from '@/components/domain/Panel'
import { Button, Chip, type ChipTone } from '@/components/ui'
import { EVIDENCE_LABEL, PURCHASE_TYPE_LABEL } from '@/domain/constants'
import { formatDate, formatDateTime, formatKRW } from '@/domain/format'
import { can } from '@/domain/rules'
import type { ErpData, Evidence, EvidenceKind, EvidenceStatus, Role } from '@/domain/types'

const STATUS: Record<EvidenceStatus | 'MISSING', { tone: ChipTone; label: string }> = {
  MISSING: { tone: 'error', label: '미수취' },
  SUBMITTED: { tone: 'progress', label: '제출됨 · 검증 대기' },
  VERIFIED: { tone: 'success', label: '검증 완료' },
  REJECTED: { tone: 'default', label: '반려' },
}

interface Props {
  vehicleId: string
  data: ErpData
  role: Role
  onUpload: (kind: EvidenceKind) => void
  onVerify: (evidenceId: string, approve: boolean) => void
}

/** 매입 정보와 증빙 — 증빙이 올라온 것과 회계가 확인한 것은 다르다 */
export function EvidencePanel({ vehicleId, data, role, onUpload, onVerify }: Props) {
  const p = data.purchases[vehicleId]
  const vendor = data.vendors[p.vendorId]
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? id
  const evidences = data.evidences.filter((e) => e.vehicleId === vehicleId)
  const required = data.policy.requiredEvidence[p.purchaseType]
  const kinds = [...new Set<EvidenceKind>([...required, ...evidences.map((e) => e.kind)])]
  const latest = (kind: EvidenceKind): Evidence | undefined => evidences.filter((e) => e.kind === kind).at(-1)
  const canUpload = can(role, 'UPLOAD_EVIDENCE')
  const canVerify = can(role, 'VERIFY_EVIDENCE')

  return (
    <Panel id="evidence" title="매입 정보 · 증빙">
      <dl className="grid grid-cols-4 gap-4">
        <Field label="매입처">
          {vendor.name}
          <span className="block text-caption-sm text-gray-70">{vendor.bizRegNo ?? '개인'}</span>
        </Field>
        <Field label="매입 유형">{PURCHASE_TYPE_LABEL[p.purchaseType]}</Field>
        <Field label="매입가 (부가세 포함)">{formatKRW(p.amount)}</Field>
        <Field label="지급 · 매입일">
          {p.paymentMethod === 'CASH' ? '현금' : '계좌이체'} · {formatDate(p.purchaseDate)}
        </Field>
        <Field label="실물 인수">
          {p.handover ? `${userName(p.handover.receiverId)} · 사진 ${p.handover.photoCount}장 · ${formatDateTime(p.handover.at)}` : '미완료'}
        </Field>
      </dl>

      <table className="w-full text-left">
        <thead className="border-y border-gray-20 text-label-md text-gray-70">
          <tr>
            <th className="py-2.5">증빙</th>
            <th className="py-2.5">파일</th>
            <th className="py-2.5">제출</th>
            <th className="py-2.5">상태</th>
            <th className="py-2.5" />
          </tr>
        </thead>
        <tbody>
          {kinds.map((kind) => {
            const e = latest(kind)
            const status = STATUS[e?.status ?? 'MISSING']
            const isRequired = required.includes(kind)
            return (
              <tr key={kind} className="border-b border-gray-20">
                <td className="py-3 text-body-md">
                  {EVIDENCE_LABEL[kind]}
                  {!isRequired && <span className="ml-1 text-caption-sm text-gray-50">(필수 아님)</span>}
                </td>
                <td className="py-3 text-body-sm text-gray-80">
                  {e ? (
                    <>
                      {e.fileName}
                      {e.amount != null && <span className="block text-caption-sm text-gray-70">금액 {formatKRW(e.amount)}</span>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 text-caption-md text-gray-70">{e ? `${userName(e.uploadedBy)} · ${formatDateTime(e.uploadedAt)}` : '—'}</td>
                <td className="py-3">
                  <Chip tone={status.tone}>{status.label}</Chip>
                  {e?.verifiedBy && e.status !== 'SUBMITTED' && (
                    <span className="block text-caption-sm text-gray-50">{userName(e.verifiedBy)} 확인</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex justify-end gap-1.5">
                    {e?.status === 'SUBMITTED' && canVerify && (
                      <>
                        <Button variant="outlined-gray" size="sm" onClick={() => onVerify(e.id, false)}>
                          반려
                        </Button>
                        <Button size="sm" onClick={() => onVerify(e.id, true)}>
                          검증
                        </Button>
                      </>
                    )}
                    {(!e || e.status === 'REJECTED') && isRequired && canUpload && (
                      <Button variant="outlined" size="sm" onClick={() => onUpload(kind)}>
                        올리기
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-caption-md text-gray-70">제출된 증빙은 회계 검증을 거쳐야 매입세액 확보로 계산됩니다.</p>
    </Panel>
  )
}

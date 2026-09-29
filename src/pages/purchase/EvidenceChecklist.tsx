import { Button, Chip, FileButton } from '@/components/ui'
import { EVIDENCE_LABEL } from '@/domain/constants'
import type { EvidenceKind, Policy, PurchaseType } from '@/domain/types'

interface Props {
  purchaseType: PurchaseType
  policy: Policy
  files: { kind: EvidenceKind; fileName: string }[]
  onChange: (files: { kind: EvidenceKind; fileName: string }[]) => void
}

/** 매입 유형별 필수 증빙 — 유형을 바꾸면 목록이 바뀐다 */
export function EvidenceChecklist({ purchaseType, policy, files, onChange }: Props) {
  const required = policy.requiredEvidence[purchaseType]
  const vat = policy.vatEvidence[purchaseType]
  // 딜러·경매는 세금계산서 대신 간이영수증만 받은 경우도 기록할 수 있다 (유형 불일치 판정 대상)
  const kinds: EvidenceKind[] = purchaseType === 'INDIVIDUAL' ? required : [...required, 'SIMPLE_RECEIPT']
  const fileOf = (kind: EvidenceKind) => files.find((f) => f.kind === kind)

  const hint = (kind: EvidenceKind) => {
    if (kind === 'SIMPLE_RECEIPT') return '세금계산서를 받지 못한 경우 (매입세액 공제 불가)'
    if (kind === 'ID_COPY') return '매도인 신원 확인 — 없으면 매입 확정 차단'
    if (vat.includes(kind)) return '매입세액 공제 요건'
    return '필수 서류'
  }

  return (
    <ul className="divide-y divide-gray-20">
      {kinds.map((kind) => {
        const file = fileOf(kind)
        const optional = !required.includes(kind)
        return (
          <li key={kind} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-body-md-m text-gray-90">
                {EVIDENCE_LABEL[kind]}
                {!optional && <span className="ml-0.5 text-red-40">*</span>}
              </p>
              <p className="text-caption-md text-gray-70">{file ? file.fileName : hint(kind)}</p>
            </div>
            {file ? (
              <>
                <Chip tone="progress">제출 · 회계 검증 대기</Chip>
                <Button variant="text" size="sm" onClick={() => onChange(files.filter((f) => f.kind !== kind))}>
                  삭제
                </Button>
              </>
            ) : (
              <>
                {!optional && <Chip tone="error">미제출</Chip>}
                <FileButton onSelect={(f) => onChange([...files.filter((x) => x.kind !== kind), { kind, fileName: f.name }])}>
                  파일 선택
                </FileButton>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

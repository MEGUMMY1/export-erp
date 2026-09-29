import { useState } from 'react'
import { PhotoSlots } from '@/components/domain/PhotoSlots'
import { GateLabel } from '@/components/domain/RiskChip'
import { Checkbox, Dropdown, Modal, NumberField, TextArea, TextField, toast } from '@/components/ui'
import { CURRENCY_DECIMALS, EVIDENCE_LABEL } from '@/domain/constants'
import { formatKRW } from '@/domain/format'
import type { EvidenceKind, GateResult } from '@/domain/types'
import { useData, useErpStore } from '@/store'

const report = (result: { ok: boolean; reasons: string[] }, success: string) => {
  if (result.ok) toast.success(success)
  else toast.error(result.reasons[0])
  return result.ok
}

/** 실물 인수 — 인수자·차량번호·외관 사진이 있어야 매입을 확정할 수 있다 */
export function HandoverModal({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const data = useData()
  const completeHandover = useErpStore((s) => s.completeHandover)
  const v = data.vehicles[vehicleId]
  const [plateChecked, setPlateChecked] = useState(false)
  const [photos, setPhotos] = useState(0)

  return (
    <Modal
      open
      onClose={onClose}
      title="실물 인수 확인"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{
        label: '인수 완료',
        disabled: !plateChecked || photos === 0,
        onClick: () => report(completeHandover(vehicleId, { photoCount: photos }), '인수 완료 처리했습니다') && onClose(),
      }}
    >
      <div className="flex flex-col gap-4">
        <Checkbox checked={plateChecked} onChange={(e) => setPlateChecked(e.target.checked)} label={`차량번호 ${v.plateNumber} 실물과 일치 확인`} />
        <div className="flex flex-col gap-2">
          <p className="text-caption-md text-gray-80">외관 사진 (전·후·좌·우)</p>
          <PhotoSlots count={photos} onChange={setPhotos} />
        </div>
      </div>
    </Modal>
  )
}

/** 증빙 올리기 — 제출 상태로 등록되고 회계 검증을 거쳐야 확보된다 */
export function EvidenceUploadModal({ vehicleId, kind: initialKind, onClose }: { vehicleId: string; kind: EvidenceKind; onClose: () => void }) {
  const data = useData()
  const uploadEvidence = useErpStore((s) => s.uploadEvidence)
  const p = data.purchases[vehicleId]
  const [kind, setKind] = useState<EvidenceKind>(initialKind)
  const [fileName, setFileName] = useState('')
  const [amount, setAmount] = useState<number | null>(p.amount)
  const needsAmount = kind === 'TAX_INVOICE' || kind === 'SIMPLE_RECEIPT'

  return (
    <Modal
      open
      onClose={onClose}
      title="증빙 올리기"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{
        label: '제출',
        disabled: !fileName || (needsAmount && !amount),
        onClick: () =>
          report(
            uploadEvidence(vehicleId, { kind, fileName, amount: needsAmount ? (amount ?? undefined) : undefined }),
            `${EVIDENCE_LABEL[kind]} 제출 완료 · 회계 검증 대기`,
          ) && onClose(),
      }}
    >
      <div className="flex flex-col gap-4">
        <Dropdown
          size="sm"
          label="증빙 종류"
          required
          value={kind}
          onChange={setKind}
          options={data.policy.requiredEvidence[p.purchaseType].map((k) => ({ value: k, label: EVIDENCE_LABEL[k] }))}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-caption-md text-gray-80">
            파일 <span className="text-red-40">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="text-body-sm text-gray-80 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-40 file:bg-white file:px-3 file:py-2 file:text-label-md"
          />
        </div>
        {needsAmount && (
          <NumberField
            size="sm"
            label="증빙 금액"
            required
            value={amount}
            onChange={setAmount}
            decimals={CURRENCY_DECIMALS.KRW}
            suffix="KRW"
            message={`등록 매입가 ${formatKRW(p.amount)} — 금액이 다르면 금액 불일치(S3)로 판정됩니다.`}
          />
        )}
      </div>
    </Modal>
  )
}

/** 회계 확인 — 반복 매도인·역마진·국내 판매 전환은 회계 판단으로 해소 */
export function AcknowledgeModal({ vehicleId, gate, onClose }: { vehicleId: string; gate: GateResult; onClose: () => void }) {
  const acknowledgeGate = useErpStore((s) => s.acknowledgeGate)
  const [note, setNote] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title="회계 확인"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{
        label: '확인 완료',
        disabled: !note.trim(),
        onClick: () => report(acknowledgeGate(vehicleId, gate.code, note), `${gate.code} 확인 처리했습니다`) && onClose(),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 rounded-lg border border-gray-30 px-4 py-3">
          <GateLabel gate={gate} />
          <p className="text-body-sm text-gray-80">{gate.reason}</p>
        </div>
        <TextArea
          label="확인 내용"
          required
          placeholder="예) 매도인 사업자 여부 조회 결과 비사업자 확인"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          message="확인 내용은 처리 이력에 남습니다."
        />
      </div>
    </Modal>
  )
}

/** 불공제 확정 — 사후 증빙을 끝내 받지 못한 경우 손실로 확정하고 종결한다 (성공 경로만 있는 흐름을 막는다) */
export function WriteOffModal({ vehicleId, amount, onClose }: { vehicleId: string; amount: number; onClose: () => void }) {
  const writeOffVat = useErpStore((s) => s.writeOffVat)
  const [reason, setReason] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title="매입세액 불공제 확정"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{
        label: '불공제 확정',
        disabled: !reason.trim(),
        onClick: () => report(writeOffVat(vehicleId, reason), '불공제를 확정했습니다') && onClose(),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-lg border border-gray-30 px-4 py-3">
          <p className="text-caption-md text-gray-70">손실로 확정할 금액 (증빙 미확보 예상 금액)</p>
          <p className="text-title-md text-red-60">{formatKRW(amount)}</p>
          <p className="text-caption-md text-gray-70">매입 증빙 항목(S1~S3)이 종결되고, 다른 보완 항목이 없으면 차량이 종결됩니다. 손실 전표 발행은 회계 시스템에서 처리합니다.</p>
        </div>
        <TextArea
          label="확정 사유"
          required
          placeholder="예) 매도 딜러 폐업으로 세금계산서 수취 불가"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          message="사유는 처리 이력에 남고, 조건부 선적 책임자의 이행 이력에 불공제 확정으로 기록됩니다."
        />
      </div>
    </Modal>
  )
}

/** 통관 정보 보완 — 관세사·예정 선적일 */
export function FixSaleModal({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const data = useData()
  const updateSale = useErpStore((s) => s.updateSale)
  const sale = data.sales[vehicleId]
  const [broker, setBroker] = useState(sale.customsBroker ?? '')
  const [date, setDate] = useState(sale.expectedShipmentDate ?? '')

  return (
    <Modal
      open
      onClose={onClose}
      title="통관 정보 보완"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{
        label: '저장',
        disabled: !broker || !date,
        onClick: () => report(updateSale(vehicleId, { customsBroker: broker, expectedShipmentDate: date }), '통관 정보를 보완했습니다') && onClose(),
      }}
    >
      <div className="flex flex-col gap-4">
        <Dropdown size="sm" label="관세사" required value={broker || null} onChange={setBroker} options={data.brokers.map((b) => ({ value: b, label: b }))} />
        <TextField size="sm" type="date" label="예정 선적일" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </Modal>
  )
}

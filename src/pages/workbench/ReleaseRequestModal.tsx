import { useState } from 'react'
import { GateChip } from '../../components/domain/RiskChip'
import { Dropdown, Modal, TextArea, toast } from '../../components/ui'
import { addDays, formatKRW } from '../../domain/format'
import { TODAY } from '../../domain/constants'
import { canRequestRelease } from '../../domain/rules'
import { useCurrentUser, useData, useErpStore, useEvaluations } from '../../store'

interface Props {
  vehicleId: string | null
  onClose: () => void
}

/** 조건부 선적 요청 — 무엇을, 언제까지, 누가, 얼마짜리 리스크인지 결재자에게 넘긴다 */
export function ReleaseRequestModal({ vehicleId, onClose }: Props) {
  const data = useData()
  const evals = useEvaluations()
  const user = useCurrentUser()
  const requestRelease = useErpStore((s) => s.requestRelease)
  const [reason, setReason] = useState('')
  const [dueDays, setDueDays] = useState(String(data.policy.conditionalDueDays))
  const [error, setError] = useState<string>()

  if (!vehicleId) return null
  const vehicle = data.vehicles[vehicleId]
  const ev = evals[vehicleId]
  const guard = canRequestRelease(vehicleId, user.id, data, ev)
  const soft = ev.gates.filter((g) => g.severity === 'SOFT')
  const maxDays = data.policy.conditionalDueDays

  const submit = () => {
    const result = requestRelease(vehicleId, { reason, dueDays: Number(dueDays) })
    if (!result.ok) {
      setError(result.reasons[0])
      return
    }
    toast.success('조건부 선적 결재를 요청했습니다')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="조건부 선적 요청"
      size="large"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{ label: '결재 요청', onClick: submit, disabled: !guard.ok }}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-lg bg-gray-10 px-4 py-3">
          <p className="text-subtitle-md">
            {vehicle.plateNumber} · {vehicle.manufacturer} {vehicle.model}
          </p>
          <p className="mt-0.5 font-mono text-caption-sm text-gray-70">{vehicle.vin}</p>
        </div>

        {!guard.ok && (
          <div className="rounded-lg border border-red-30 bg-red-10 px-4 py-3 text-body-sm text-red-60">
            <p className="text-subtitle-sm">요청할 수 없습니다</p>
            <ul className="mt-1 list-disc pl-4">
              {guard.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <p className="text-caption-md text-gray-80">선적 후 보완할 항목</p>
          <ul className="flex flex-col gap-2">
            {soft.map((g) => (
              <li key={g.code} className="flex flex-col gap-1 rounded-lg border border-gray-30 px-4 py-3">
                <GateChip gate={g} />
                <p className="text-body-sm text-gray-80">{g.reason}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-caption-md text-gray-80">예상 부가세 영향 (미확보 매입세액)</p>
            <p className="text-title-md text-orange-60">{formatKRW(ev.vat.unsecured)}</p>
          </div>
          <Dropdown
            size="sm"
            label="보완 기한"
            required
            value={dueDays}
            onChange={setDueDays}
            options={[3, 5, maxDays].map((d) => ({
              value: String(d),
              label: `${addDays(TODAY, d)} (D-${d})${d === maxDays ? ' · 정책 최대' : ''}`,
            }))}
          />
        </div>

        <TextArea
          label="요청 사유"
          required
          placeholder="예) 바이어 선적 일정 고정, 딜러 세금계산서 발행 지연"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setError(undefined)
          }}
          error={error}
          message={`보완 책임자: ${user.name} · 기한을 넘기면 신규 조건부 선적 요청이 제한됩니다.`}
        />
      </div>
    </Modal>
  )
}

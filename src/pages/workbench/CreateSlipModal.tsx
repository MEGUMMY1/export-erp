import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dropdown, Modal, TextField, toast } from '@/components/ui'
import { addDays, formatKRW } from '@/domain/format'
import { TODAY } from '@/domain/constants'
import { useData, useErpStore, useEvaluations, type SlipInput } from '@/store'

interface Props {
  vehicleIds: string[]
  onClose: () => void
  onCreated: () => void
}

const DEPARTURE_PORTS = ['인천항', '평택항']

export function CreateSlipModal({ vehicleIds, onClose, onCreated }: Props) {
  const data = useData()
  const evals = useEvaluations()
  const navigate = useNavigate()
  const createSlip = useErpStore((s) => s.createSlip)
  const arrivalPorts = [...new Set(Object.values(data.buyers).map((b) => b.port))]

  // 가장 많은 바이어의 도착항을 기본값으로
  const portCounts = vehicleIds.reduce<Record<string, number>>((acc, id) => {
    const port = data.buyers[data.sales[id]?.buyerId]?.port
    if (port) acc[port] = (acc[port] ?? 0) + 1
    return acc
  }, {})
  const defaultPort = Object.entries(portCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? arrivalPorts[0]

  const [form, setForm] = useState<SlipInput>({
    vessel: '',
    voyage: '',
    departurePort: DEPARTURE_PORTS[0],
    arrivalPort: defaultPort,
    scheduledDeparture: addDays(TODAY, 5),
  })
  const [error, setError] = useState<string>()
  const update = (patch: Partial<SlipInput>) => setForm((f) => ({ ...f, ...patch }))

  const conditional = vehicleIds.filter((id) => evals[id].releaseCovers)
  const conditionalVat = conditional.reduce((sum, id) => sum + evals[id].vat.unsecured, 0)
  const valid = form.vessel.trim() && form.voyage.trim() && form.scheduledDeparture

  const submit = () => {
    const result = createSlip(vehicleIds, { ...form, vessel: form.vessel.trim().toUpperCase(), voyage: form.voyage.trim().toUpperCase() })
    if (!result.ok) {
      setError(result.reasons.join(' / '))
      return
    }
    toast.success(`선적 전표를 만들고 결재를 요청했습니다 (${vehicleIds.length}대)`)
    onCreated()
    navigate(`/shipments?id=${result.id}`)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="선적 전표 만들기"
      size="large"
      showClose
      cancel={{ label: '취소', onClick: onClose }}
      confirm={{ label: '전표 생성 · 결재 요청', onClick: submit, disabled: !valid }}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-10 px-4 py-3 text-body-sm">
          <div>
            <p className="text-gray-70">편입 차량</p>
            <p className="text-subtitle-md">{vehicleIds.length}대</p>
          </div>
          <div>
            <p className="text-gray-70">정상</p>
            <p className="text-subtitle-md text-green-60">{vehicleIds.length - conditional.length}대</p>
          </div>
          <div>
            <p className="text-gray-70">조건부 승인</p>
            <p className="text-subtitle-md text-orange-60">
              {conditional.length}대{conditional.length > 0 && ` · ${formatKRW(conditionalVat)}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField size="sm" label="선박명" required placeholder="예) SEA PIONEER" value={form.vessel} onChange={(e) => update({ vessel: e.target.value })} />
          <TextField size="sm" label="항차" required placeholder="예) 2610W" value={form.voyage} onChange={(e) => update({ voyage: e.target.value })} />
          <Dropdown
            size="sm"
            label="출항항"
            required
            value={form.departurePort}
            onChange={(v) => update({ departurePort: v })}
            options={DEPARTURE_PORTS.map((p) => ({ value: p, label: p }))}
          />
          <Dropdown
            size="sm"
            label="도착항"
            required
            value={form.arrivalPort}
            onChange={(v) => update({ arrivalPort: v })}
            options={arrivalPorts.map((p) => ({ value: p, label: p }))}
          />
          <TextField
            size="sm"
            type="date"
            label="예정 출항일"
            required
            min={TODAY}
            value={form.scheduledDeparture}
            onChange={(e) => update({ scheduledDeparture: e.target.value })}
          />
        </div>

        <p className="text-body-sm text-gray-70">
          정상 차량은 전표 단위로 일괄 결재됩니다. 결재 승인 전에는 선적 처리 단계로 진행할 수 없습니다.
        </p>
        {error && <p className="text-caption-md text-red-40">{error}</p>}
      </div>
    </Modal>
  )
}

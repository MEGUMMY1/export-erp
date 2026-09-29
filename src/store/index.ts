import { useMemo } from 'react'
import { create } from 'zustand'
import { TODAY } from '../domain/constants'
import { addDays, nowStamp } from '../domain/format'
import { canAddToSlip, canRequestRelease, evaluate, evaluateAll, type Guard } from '../domain/rules'
import type { AuditLog, ErpData, Shipment, User } from '../domain/types'
import { loadMockData } from '../mock'

export interface SlipInput {
  vessel: string
  voyage: string
  departurePort: string
  arrivalPort: string
  scheduledDeparture: string
}

export type ActionResult = Guard & { id?: string }

// 매입·차량·선적 공유 상태. 모든 업무 액션은 도메인 규칙(rules.ts)으로 다시 검증한 뒤 반영한다.
interface ErpState {
  data: ErpData
  currentUserId: string
  setCurrentUser: (userId: string) => void
  requestRelease: (vehicleId: string, input: { reason: string; dueDays: number }) => ActionResult
  createSlip: (vehicleIds: string[], input: SlipInput) => ActionResult
}

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`

const audit = (entry: Omit<AuditLog, 'id' | 'at'>): AuditLog => ({ id: nextId('L'), at: nowStamp(), ...entry })

export const useErpStore = create<ErpState>()((set, get) => ({
  data: loadMockData(),
  currentUserId: 'U-ACC',
  setCurrentUser: (currentUserId) => set({ currentUserId }),

  requestRelease: (vehicleId, { reason, dueDays }) => {
    const { data, currentUserId } = get()
    const ev = evaluate(vehicleId, data)
    const guard = canRequestRelease(vehicleId, currentUserId, data, ev)
    if (!guard.ok) return guard
    if (!reason.trim()) return { ok: false, reasons: ['요청 사유를 입력해 주세요.'] }

    const dueDate = addDays(TODAY, Math.min(dueDays, data.policy.conditionalDueDays))
    const id = nextId('R')
    const gateCodes = ev.gates.filter((g) => g.severity === 'SOFT').map((g) => g.code)
    set({
      data: {
        ...data,
        releases: [
          ...data.releases,
          {
            id,
            vehicleId,
            gateCodes,
            dueDate,
            ownerId: currentUserId,
            requestedBy: currentUserId,
            requestedAt: nowStamp(),
            reason: reason.trim(),
            vatImpact: ev.vat.unsecured,
            status: 'PENDING',
          },
        ],
        auditLogs: [
          ...data.auditLogs,
          audit({ vehicleId, action: '조건부 선적 요청', actorId: currentUserId, reason: `${gateCodes.join('·')} / 기한 ${dueDate} / ${reason.trim()}` }),
        ],
      },
    })
    return { ok: true, reasons: [], id }
  },

  createSlip: (vehicleIds, input) => {
    const { data, currentUserId } = get()
    const blocked = vehicleIds.flatMap((id) => {
      const g = canAddToSlip(id, data)
      return g.ok ? [] : [`${data.vehicles[id].plateNumber}: ${g.reasons[0]}`]
    })
    if (!vehicleIds.length) return { ok: false, reasons: ['선택된 차량이 없습니다.'] }
    if (blocked.length) return { ok: false, reasons: blocked }

    const todayCount = Object.values(data.shipments).filter((s) => s.createdAt.startsWith(TODAY)).length
    const slipNo = `SP-${TODAY.slice(2).replaceAll('-', '')}-${String(todayCount + 1).padStart(2, '0')}`
    const id = nextId('S')
    const at = nowStamp()
    const shipment: Shipment = {
      id,
      slipNo,
      ...input,
      container: 'RoRo',
      vehicleIds,
      status: 'PENDING',
      createdBy: currentUserId,
      createdAt: at,
    }
    const vehicles = { ...data.vehicles }
    for (const vid of vehicleIds) vehicles[vid] = { ...vehicles[vid], stage: 'IN_SLIP', shipmentId: id }

    set({
      data: {
        ...data,
        vehicles,
        shipments: { ...data.shipments, [id]: shipment },
        auditLogs: [
          ...data.auditLogs,
          ...vehicleIds.map((vehicleId) =>
            audit({ vehicleId, shipmentId: id, action: '선적 전표 편입 · 결재 요청', actorId: currentUserId, prevStage: 'SALE_REGISTERED', nextStage: 'IN_SLIP', reason: slipNo }),
          ),
        ],
      },
    })
    return { ok: true, reasons: [], id }
  },
}))

export const useData = () => useErpStore((s) => s.data)

export const useCurrentUser = (): User => {
  const users = useErpStore((s) => s.data.users)
  const id = useErpStore((s) => s.currentUserId)
  return users.find((u) => u.id === id) ?? users[0]
}

/** 전 차량 게이트 판정 — 데이터가 바뀔 때만 다시 계산 */
export const useEvaluations = () => {
  const data = useData()
  return useMemo(() => evaluateAll(data), [data])
}

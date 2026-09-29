import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ACKNOWLEDGEABLE, EVIDENCE_LABEL, GATE_META, TODAY } from '@/domain/constants'
import { addDays, formatDate, formatKRW, formatMoney, nowStamp } from '@/domain/format'
import { evaluateGates } from '@/domain/gates'
import { can, canAddToSlip, canConfirmPurchase, canRequestRelease, evaluate, evaluateAll, permissionHint, type Guard, type Permission } from '@/domain/rules'
import { applyDraft, isHandoverDone, validateDraft, type PurchaseDraft } from '@/domain/purchaseDraft'
import { applySale, saleBlockReason, validateSale, type SaleDraft } from '@/domain/saleDraft'
import type { AuditLog, ErpData, EvidenceKind, GateCode, Notification, Sale, Shipment, User } from '@/domain/types'
import { lookupVin, vinResultLabel } from '@/domain/vin'
import { loadMockData } from '@/mock'

export interface SlipInput {
  vessel: string
  voyage: string
  departurePort: string
  arrivalPort: string
  scheduledDeparture: string
}

export type ActionResult = Guard & { id?: string }

// 매입·차량·선적 공유 상태. 모든 업무 액션은 권한과 도메인 규칙(rules.ts)으로 다시 검증한 뒤 반영한다.
interface ErpState {
  data: ErpData
  currentUserId: string
  setCurrentUser: (userId: string) => void
  requestRelease: (vehicleId: string, input: { reason: string; dueDays: number }) => ActionResult
  createSlip: (vehicleIds: string[], input: SlipInput) => ActionResult
  completeHandover: (vehicleId: string, input: { photoCount: number }) => ActionResult
  confirmPurchase: (vehicleId: string) => ActionResult
  uploadEvidence: (vehicleId: string, input: { kind: EvidenceKind; fileName: string; amount?: number }) => ActionResult
  verifyEvidence: (evidenceId: string, approve: boolean) => ActionResult
  recheckVin: (vehicleId: string) => ActionResult
  correctDeclaration: (vehicleId: string) => ActionResult
  acceptDeclaration: (vehicleId: string) => ActionResult
  acknowledgeGate: (vehicleId: string, code: GateCode, note: string) => ActionResult
  updateSale: (vehicleId: string, patch: Pick<Sale, 'customsBroker' | 'expectedShipmentDate'>) => ActionResult
  registerPurchase: (draft: PurchaseDraft, options: { confirm: boolean }) => ActionResult
  registerSale: (vehicleId: string | null, draft: SaleDraft) => ActionResult
  decideSlip: (shipmentId: string, approve: boolean, reason?: string) => ActionResult
  processShipment: (shipmentId: string) => ActionResult & { shipped?: string[]; excluded?: { vehicleId: string; reasons: string[] }[] }
  decideRelease: (releaseId: string, approve: boolean, note: string) => ActionResult
  /** 현재 사용자의 알림 읽음 처리 (ids 없으면 전체) */
  markNotificationsRead: (ids?: string[]) => void
  /** 시연 데이터를 초기 mock 상태로 되돌린다 */
  resetDemo: () => void
}

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++seq).toString(36)}`

const audit = (entry: Omit<AuditLog, 'id' | 'at'>): AuditLog => ({ id: nextId('L'), at: nowStamp(), ...entry })

type NewNotification = Omit<Notification, 'id' | 'at' | 'actorId' | 'readBy'>

/** 매입·매출 언밸런스 알림 — 판매 등록 직후 판정 결과로 만든다 */
function unbalanceNote(vehicleId: string, db: ErpData): NewNotification | null {
  const gates = evaluateGates(vehicleId, db).filter((g) => ['S1', 'S2', 'S3', 'S5', 'S8'].includes(g.code))
  if (!gates.length) return null
  const vat = gates.find((g) => g.vatImpact)?.vatImpact
  // 증빙 없는 매입을 과세 매출로 처리 → 부가세 이중 손실로 격상
  const doubleLoss = gates.some((g) => g.code === 'S8' && g.vatImpact)
  return {
    severity: doubleLoss ? 'error' : 'warning',
    title: doubleLoss ? '매입·매출 언밸런스 · 부가세 이중 손실' : '매입·매출 언밸런스',
    message: `${db.vehicles[vehicleId].plateNumber} · ${gates.map((g) => g.title).join(', ')}${vat ? ` · 미확보 매입세액 ${formatKRW(vat)}` : ''}`,
    link: `/vehicles/${vehicleId}`,
    roles: ['ACCOUNTING'],
    vehicleId,
  }
}

const ok = (id?: string): ActionResult => ({ ok: true, reasons: [], id })
const fail = (...reasons: string[]): ActionResult => ({ ok: false, reasons })

/**
 * 변경 후 공통 정리: 선적 완료 차량의 보완 항목이 모두 해소되면 조건부 선적을 해소 처리하고 종결한다.
 */
function settle(data: ErpData, actorId: string): ErpData {
  let changed = false
  const vehicles = { ...data.vehicles }
  const logs: AuditLog[] = []
  const releases = data.releases.map((r) => {
    if (r.status !== 'APPROVED' || r.resolvedAt) return r
    const open = evaluateGates(r.vehicleId, data).some((g) => r.gateCodes.includes(g.code))
    if (open) return r
    changed = true
    logs.push(audit({ vehicleId: r.vehicleId, action: '사후 증빙 보완 완료', actorId, reason: r.gateCodes.join('·') }))
    return { ...r, resolvedAt: nowStamp() }
  })
  for (const v of Object.values(data.vehicles)) {
    if (v.stage !== 'SHIPPED') continue
    if (evaluateGates(v.id, data).length === 0) {
      changed = true
      vehicles[v.id] = { ...v, stage: 'CLOSED' }
      logs.push(audit({ vehicleId: v.id, action: '종결', actorId, prevStage: 'SHIPPED', nextStage: 'CLOSED', reason: '보완 항목 없음' }))
    }
  }
  return changed ? { ...data, vehicles, releases, auditLogs: [...data.auditLogs, ...logs] } : data
}

export const useErpStore = create<ErpState>()(
  persist(
    (set, get) => {
      /** 현재 사용자 권한 확인 */
      const deny = (permission: Permission) => {
        const { data, currentUserId } = get()
        const user = data.users.find((u) => u.id === currentUserId)
        return user && can(user.role, permission) ? null : fail(`${permissionHint(permission)}이 필요합니다.`)
      }
      /** 데이터 변경 + 감사 로그 + 알림 + 공통 정리 */
      const commit = (next: ErpData, logs: Omit<AuditLog, 'id' | 'at'>[], notes: NewNotification[] = []) => {
        const actorId = get().currentUserId
        const at = nowStamp()
        set({
          data: settle(
            {
              ...next,
              auditLogs: [...next.auditLogs, ...logs.map(audit)],
              notifications: [...next.notifications, ...notes.map((n) => ({ id: nextId('N'), at, actorId, readBy: [], ...n }))],
            },
            actorId,
          ),
        })
      }

      return {
        data: loadMockData(),
        currentUserId: 'U-ACC',
        setCurrentUser: (currentUserId) => set({ currentUserId }),
        resetDemo: () => set({ data: loadMockData(), currentUserId: 'U-ACC' }),

        markNotificationsRead: (ids) => {
          const { data, currentUserId } = get()
          const target = ids ? new Set(ids) : null
          set({
            data: {
              ...data,
              notifications: data.notifications.map((n) =>
                (!target || target.has(n.id)) && !n.readBy.includes(currentUserId) ? { ...n, readBy: [...n.readBy, currentUserId] } : n,
              ),
            },
          })
        },

        requestRelease: (vehicleId, { reason, dueDays }) => {
          const denied = deny('REQUEST_RELEASE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const ev = evaluate(vehicleId, data)
          const guard = canRequestRelease(vehicleId, currentUserId, data, ev)
          if (!guard.ok) return guard
          if (!reason.trim()) return fail('요청 사유를 입력해 주세요.')

          const dueDate = addDays(TODAY, Math.min(dueDays, data.policy.conditionalDueDays))
          const id = nextId('R')
          const gateCodes = ev.gates.filter((g) => g.severity === 'SOFT').map((g) => g.code)
          commit(
            {
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
            },
            [
              {
                vehicleId,
                action: '조건부 선적 요청',
                actorId: currentUserId,
                reason: `${gateCodes.join('·')} / 기한 ${formatDate(dueDate)} / ${reason.trim()}`,
              },
            ],
            [
              {
                severity: 'warning',
                title: '조건부 선적 결재 요청',
                message: `${data.vehicles[vehicleId].plateNumber} · ${gateCodes.join('·')} · 보완 기한 ${formatDate(dueDate)}${ev.vat.unsecured ? ` · 미확보 ${formatKRW(ev.vat.unsecured)}` : ''}`,
                link: '/shipments?tab=releases',
                roles: ['ACCOUNTING'],
                vehicleId,
              },
            ],
          )
          return ok(id)
        },

        createSlip: (vehicleIds, input) => {
          const denied = deny('CREATE_SLIP')
          if (denied) return denied
          const { data, currentUserId } = get()
          if (!vehicleIds.length) return fail('선택된 차량이 없습니다.')
          const blocked = vehicleIds.flatMap((id) => {
            const g = canAddToSlip(id, data)
            return g.ok ? [] : [`${data.vehicles[id].plateNumber}: ${g.reasons[0]}`]
          })
          if (blocked.length) return fail(...blocked)

          const todayCount = Object.values(data.shipments).filter((s) => s.createdAt.startsWith(TODAY)).length
          const slipNo = `SP-${TODAY.slice(2).replaceAll('-', '')}-${String(todayCount + 1).padStart(2, '0')}`
          const id = nextId('S')
          const shipment: Shipment = {
            id,
            slipNo,
            ...input,
            container: 'RoRo',
            vehicleIds,
            status: 'PENDING',
            createdBy: currentUserId,
            createdAt: nowStamp(),
          }
          const vehicles = { ...data.vehicles }
          for (const vid of vehicleIds) vehicles[vid] = { ...vehicles[vid], stage: 'IN_SLIP', shipmentId: id }
          commit(
            { ...data, vehicles, shipments: { ...data.shipments, [id]: shipment } },
            vehicleIds.map((vehicleId) => ({
              vehicleId,
              shipmentId: id,
              action: '선적 전표 편입 · 결재 요청',
              actorId: currentUserId,
              prevStage: 'SALE_REGISTERED' as const,
              nextStage: 'IN_SLIP' as const,
              reason: slipNo,
            })),
            [
              {
                severity: 'info',
                title: '선적 전표 결재 요청',
                message: `${slipNo} · ${vehicleIds.length}대 · ${input.vessel} ${input.voyage}`,
                link: `/shipments?id=${id}`,
                roles: ['ACCOUNTING'],
              },
            ],
          )
          return ok(id)
        },

        completeHandover: (vehicleId, { photoCount }) => {
          const denied = deny('HANDOVER')
          if (denied) return denied
          const { data, currentUserId } = get()
          const v = data.vehicles[vehicleId]
          if (v.stage !== 'PURCHASE_REGISTERED') return fail('인수 대기 단계가 아닙니다.')
          if (photoCount < 1) return fail('외관 사진을 1장 이상 올려 주세요.')
          const vc = v.vinCheck
          if (vc && (vc.theft || vc.seizure || vc.lien)) return fail('압류·저당·도난 차량은 인수할 수 없습니다. 해제 확인 후 VIN을 재조회해 주세요.')
          const handover = { receiverId: currentUserId, plateChecked: true, photoCount, at: nowStamp() }
          commit(
            {
              ...data,
              vehicles: { ...data.vehicles, [vehicleId]: { ...v, stage: 'HANDED_OVER' } },
              purchases: { ...data.purchases, [vehicleId]: { ...data.purchases[vehicleId], handover } },
            },
            [
              {
                vehicleId,
                action: '인수 완료',
                actorId: currentUserId,
                prevStage: v.stage,
                nextStage: 'HANDED_OVER',
                reason: `차량번호 확인 · 외관 사진 ${photoCount}장`,
              },
            ],
          )
          return ok()
        },

        confirmPurchase: (vehicleId) => {
          const denied = deny('CONFIRM_PURCHASE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const guard = canConfirmPurchase(vehicleId, data)
          if (!guard.ok) return guard
          const v = data.vehicles[vehicleId]
          commit({ ...data, vehicles: { ...data.vehicles, [vehicleId]: { ...v, stage: 'PURCHASE_CONFIRMED' } } }, [
            { vehicleId, action: '매입 확정', actorId: currentUserId, prevStage: v.stage, nextStage: 'PURCHASE_CONFIRMED' },
          ])
          return ok()
        },

        uploadEvidence: (vehicleId, { kind, fileName, amount }) => {
          const denied = deny('UPLOAD_EVIDENCE')
          if (denied) return denied
          const { data, currentUserId } = get()
          if (!fileName.trim()) return fail('파일을 선택해 주세요.')
          const id = nextId('E')
          commit(
            {
              ...data,
              evidences: [
                ...data.evidences,
                { id, vehicleId, kind, fileName: fileName.trim(), amount, uploadedBy: currentUserId, uploadedAt: nowStamp(), status: 'SUBMITTED' },
              ],
            },
            [{ vehicleId, action: '증빙 제출', actorId: currentUserId, reason: `${EVIDENCE_LABEL[kind]} · ${fileName.trim()}` }],
            [
              {
                severity: 'info',
                title: '증빙 검증 요청',
                message: `${data.vehicles[vehicleId].plateNumber} · ${EVIDENCE_LABEL[kind]} 제출`,
                link: `/vehicles/${vehicleId}`,
                roles: ['ACCOUNTING'],
                vehicleId,
              },
            ],
          )
          return ok(id)
        },

        verifyEvidence: (evidenceId, approve) => {
          const denied = deny('VERIFY_EVIDENCE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const ev = data.evidences.find((e) => e.id === evidenceId)
          if (!ev || ev.status !== 'SUBMITTED') return fail('검증 대기 중인 증빙이 아닙니다.')
          commit(
            {
              ...data,
              evidences: data.evidences.map((e) =>
                e.id === evidenceId ? { ...e, status: approve ? 'VERIFIED' : 'REJECTED', verifiedBy: currentUserId, verifiedAt: nowStamp() } : e,
              ),
            },
            [{ vehicleId: ev.vehicleId, action: approve ? '증빙 검증 완료' : '증빙 반려', actorId: currentUserId, reason: EVIDENCE_LABEL[ev.kind] }],
            approve
              ? []
              : [
                  {
                    severity: 'warning',
                    title: '증빙 반려',
                    message: `${data.vehicles[ev.vehicleId].plateNumber} · ${EVIDENCE_LABEL[ev.kind]} 재제출 필요`,
                    link: `/vehicles/${ev.vehicleId}`,
                    roles: [],
                    userIds: [ev.uploadedBy],
                    vehicleId: ev.vehicleId,
                  },
                ],
          )
          return ok()
        },

        recheckVin: (vehicleId) => {
          const denied = deny('RECHECK_VIN')
          if (denied) return denied
          const { data, currentUserId } = get()
          const v = data.vehicles[vehicleId]
          const { note, ...vinCheck } = lookupVin(v.vin, data, nowStamp())
          const result = vinResultLabel(vinCheck)
          commit(
            { ...data, vehicles: { ...data.vehicles, [vehicleId]: { ...v, vinCheck } } },
            [{ vehicleId, action: 'VIN 재조회', actorId: currentUserId, reason: note ? `${result} (${note})` : result }],
            vinCheck.theft || vinCheck.seizure || vinCheck.lien
              ? [
                  {
                    severity: 'error',
                    title: `VIN 재조회 ${result}`,
                    message: `${v.plateNumber} · ${note ?? result} · 선적 차단`,
                    link: `/vehicles/${vehicleId}`,
                    roles: ['ACCOUNTING', 'SALES'],
                    vehicleId,
                  },
                ]
              : [],
          )
          return ok()
        },

        correctDeclaration: (vehicleId) => {
          const denied = deny('FIX_EXPORT')
          if (denied) return denied
          const { data, currentUserId } = get()
          const v = data.vehicles[vehicleId]
          const decl = data.exportDecls[vehicleId]
          if (!decl) return fail('수출신고 정보가 없습니다.')
          commit({ ...data, exportDecls: { ...data.exportDecls, [vehicleId]: { ...decl, extracted: { vin: v.vin, plateNumber: v.plateNumber } } } }, [
            { vehicleId, action: '수출신고필증 정정 · 재대조', actorId: currentUserId, reason: `${decl.declNo} 정정본 대조 일치` },
          ])
          return ok()
        },

        acceptDeclaration: (vehicleId) => {
          const denied = deny('FIX_EXPORT')
          if (denied) return denied
          const { data, currentUserId } = get()
          const decl = data.exportDecls[vehicleId]
          if (!decl) return fail('수출신고 정보가 없습니다.')
          commit({ ...data, exportDecls: { ...data.exportDecls, [vehicleId]: { ...decl, status: 'ACCEPTED' } } }, [
            { vehicleId, action: '수출신고 수리 확인', actorId: currentUserId, reason: decl.declNo },
          ])
          return ok()
        },

        acknowledgeGate: (vehicleId, code, note) => {
          const denied = deny('ACKNOWLEDGE_GATE')
          if (denied) return denied
          const { data, currentUserId } = get()
          if (!ACKNOWLEDGEABLE.includes(code)) return fail('회계 확인으로 해소할 수 없는 항목입니다.')
          if (!note.trim()) return fail('확인 내용을 입력해 주세요.')
          if (!evaluateGates(vehicleId, data).some((g) => g.code === code)) return fail('이미 해소된 항목입니다.')
          const v = data.vehicles[vehicleId]
          commit({ ...data, vehicles: { ...data.vehicles, [vehicleId]: { ...v, acknowledgedGates: [...(v.acknowledgedGates ?? []), code] } } }, [
            { vehicleId, action: `회계 확인 · ${code} ${GATE_META[code].title}`, actorId: currentUserId, reason: note.trim() },
          ])
          return ok()
        },

        updateSale: (vehicleId, patch) => {
          const denied = deny('FIX_EXPORT')
          if (denied) return denied
          const { data, currentUserId } = get()
          const sale = data.sales[vehicleId]
          if (!sale) return fail('판매 정보가 없습니다.')
          commit({ ...data, sales: { ...data.sales, [vehicleId]: { ...sale, ...patch } } }, [
            {
              vehicleId,
              action: '통관 정보 보완',
              actorId: currentUserId,
              reason: [patch.customsBroker, patch.expectedShipmentDate].filter(Boolean).join(' · '),
            },
          ])
          return ok()
        },

        registerPurchase: (draft, { confirm }) => {
          const denied = deny('REGISTER_PURCHASE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const invalid = validateDraft(draft, data)
          if (invalid.length) return fail(...invalid)
          const at = nowStamp()
          const vinCheck = lookupVin(draft.vin, data, at)
          if (vinCheck.theft) return fail('도난 신고 차량은 매입 등록할 수 없습니다.')
          if (vinCheck.seizure || vinCheck.lien) return fail('압류·저당 차량은 해제가 확인되기 전에는 매입 등록할 수 없습니다.')

          const vehicleId = nextId('V')
          const ids = { vehicleId, vendorId: nextId('I'), evidenceId: () => nextId('E') }
          let next = applyDraft(data, draft, ids, currentUserId, at)
          const vinResult = vinResultLabel(vinCheck)
          const logs: Omit<AuditLog, 'id' | 'at'>[] = [
            {
              vehicleId,
              action: '매입 등록',
              actorId: currentUserId,
              nextStage: 'PURCHASE_REGISTERED',
              reason: `VIN 조회: ${vinCheck.note ? `${vinResult} (${vinCheck.note})` : vinResult}`,
            },
          ]
          if (draft.evidences.length) {
            logs.push({ vehicleId, action: '증빙 제출', actorId: currentUserId, reason: draft.evidences.map((e) => EVIDENCE_LABEL[e.kind]).join(', ') })
          }
          if (isHandoverDone(draft)) {
            logs.push({
              vehicleId,
              action: '인수 완료',
              actorId: currentUserId,
              prevStage: 'PURCHASE_REGISTERED',
              nextStage: 'HANDED_OVER',
              reason: `차량번호 확인 · 외관 사진 ${draft.handover.photoCount}장`,
            })
          }

          if (confirm) {
            const guard = canConfirmPurchase(vehicleId, next)
            if (!guard.ok) return fail(`매입 확정 불가: ${guard.reasons.join(', ')}`)
            const v = next.vehicles[vehicleId]
            next = { ...next, vehicles: { ...next.vehicles, [vehicleId]: { ...v, stage: 'PURCHASE_CONFIRMED' } } }
            logs.push({ vehicleId, action: '매입 확정', actorId: currentUserId, prevStage: v.stage, nextStage: 'PURCHASE_CONFIRMED' })
          }

          const notes: NewNotification[] = []
          if (vinCheck.seizure || vinCheck.lien) {
            notes.push({
              severity: 'error',
              title: '압류·저당 차량 매입 등록',
              message: `${draft.plateNumber} · ${vinCheck.note ?? vinResult} · 해제 전 매입 확정 불가`,
              link: `/vehicles/${vehicleId}`,
              roles: ['ACCOUNTING'],
              vehicleId,
            })
          }
          if (draft.evidences.length) {
            notes.push({
              severity: 'info',
              title: '증빙 검증 요청',
              message: `${draft.plateNumber} · ${draft.evidences.map((e) => EVIDENCE_LABEL[e.kind]).join(', ')} 제출`,
              link: `/vehicles/${vehicleId}`,
              roles: ['ACCOUNTING'],
              vehicleId,
            })
          }
          commit(next, logs, notes)
          return ok(vehicleId)
        },

        registerSale: (vehicleId, draft) => {
          const denied = deny('REGISTER_SALE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const invalid = validateSale(vehicleId, draft, data)
          if (invalid.length || !vehicleId) return fail(...invalid)
          const saleBlock = saleBlockReason(vehicleId, draft, data)
          if (saleBlock) return fail(saleBlock)

          // 신규 판매번호: SO-YYMM-N001 (mock 번호와 겹치지 않도록 N 접두)
          const newCount = Object.values(data.sales).filter((s) => s.salesNo.includes('-N')).length
          const salesNo = `SO-${TODAY.slice(2, 4)}${TODAY.slice(5, 7)}-N${String(newCount + 1).padStart(3, '0')}`
          const next = applySale(data, vehicleId, draft, salesNo, currentUserId, nowStamp())
          const buyer = data.buyers[draft.buyerId ?? '']
          const unbalance = unbalanceNote(vehicleId, next)
          commit(
            next,
            [
              {
                vehicleId,
                action: '판매 등록',
                actorId: currentUserId,
                prevStage: 'PURCHASE_CONFIRMED',
                nextStage: 'SALE_REGISTERED',
                reason: `${buyer.name} (${buyer.country}) · ${formatMoney(draft.amount ?? 0, draft.currency)}`,
              },
              {
                vehicleId,
                action: '수출신고 수리 (관세사 연동 mock)',
                actorId: currentUserId,
                reason: `${next.exportDecls[vehicleId].declNo} · 신고필증 대조 일치`,
              },
            ],
            unbalance ? [unbalance] : [],
          )
          return ok(vehicleId)
        },

        decideSlip: (shipmentId, approve, reason = '') => {
          const denied = deny('DECIDE_SLIP')
          if (denied) return denied
          const { data, currentUserId } = get()
          const s = data.shipments[shipmentId]
          if (!s || s.status !== 'PENDING') return fail('결재 대기 중인 전표가 아닙니다.')
          if (!approve && !reason.trim()) return fail('반려 사유를 입력해 주세요.')
          const at = nowStamp()

          if (approve) {
            commit(
              { ...data, shipments: { ...data.shipments, [shipmentId]: { ...s, status: 'APPROVED', decidedBy: currentUserId, decidedAt: at } } },
              s.vehicleIds.map((vehicleId) => ({ vehicleId, shipmentId, action: '선적 전표 결재 승인', actorId: currentUserId, reason: s.slipNo })),
              [
                {
                  severity: 'success',
                  title: '선적 처리 요청',
                  message: `${s.slipNo} 결재 승인 · 출항 ${formatDate(s.scheduledDeparture)}`,
                  link: `/shipments?id=${shipmentId}`,
                  roles: ['LOGISTICS'],
                  userIds: [s.createdBy],
                },
              ],
            )
            return ok(shipmentId)
          }

          // 반려: 차량은 수출 검증 단계로 돌아간다
          const vehicles = { ...data.vehicles }
          for (const id of s.vehicleIds) vehicles[id] = { ...vehicles[id], stage: 'SALE_REGISTERED', shipmentId: undefined }
          commit(
            {
              ...data,
              vehicles,
              shipments: {
                ...data.shipments,
                [shipmentId]: { ...s, status: 'REJECTED', decidedBy: currentUserId, decidedAt: at, rejectReason: reason.trim() },
              },
            },
            s.vehicleIds.map((vehicleId) => ({
              vehicleId,
              shipmentId,
              action: '선적 전표 반려',
              actorId: currentUserId,
              prevStage: 'IN_SLIP' as const,
              nextStage: 'SALE_REGISTERED' as const,
              reason: `${s.slipNo} · ${reason.trim()}`,
            })),
            [
              {
                severity: 'warning',
                title: '선적 전표 반려',
                message: `${s.slipNo} · ${reason.trim()}`,
                link: `/shipments?id=${shipmentId}`,
                roles: [],
                userIds: [s.createdBy],
              },
            ],
          )
          return ok(shipmentId)
        },

        processShipment: (shipmentId) => {
          const denied = deny('PROCESS_SHIPMENT')
          if (denied) return denied
          const { data, currentUserId } = get()
          const s = data.shipments[shipmentId]
          if (!s) return fail('전표를 찾을 수 없습니다.')
          if (s.status !== 'APPROVED') return fail('[H8] 결재 승인 전에는 선적 처리할 수 없습니다.')
          const at = nowStamp()
          const logs: Omit<AuditLog, 'id' | 'at'>[] = []

          // 1) 선적 직전 VIN 재조회 — 매입 이후 새로 걸린 압류·도난을 잡는다
          let next: ErpData = { ...data, vehicles: { ...data.vehicles } }
          for (const id of s.vehicleIds) {
            const v = next.vehicles[id]
            const { note, ...vinCheck } = lookupVin(v.vin, next, at)
            next.vehicles[id] = { ...v, vinCheck }
            const result = vinResultLabel(vinCheck)
            logs.push({ vehicleId: id, shipmentId, action: 'VIN 재조회 (선적 직전)', actorId: currentUserId, reason: note ? `${result} (${note})` : result })
          }

          // 2) 재판정 — 차단 항목이 있으면 전표에서 제외, 나머지는 선적 완료
          const excluded: { vehicleId: string; reasons: string[] }[] = []
          const shipped: string[] = []
          for (const id of s.vehicleIds) {
            // 차단(Hard) + 조건부 선적 승인으로 커버되지 않은 보완(Soft) 항목
            const ev = evaluate(id, next)
            const hard = ev.gates.filter((g) => g.severity === 'HARD' || (!ev.releaseCovers && g.severity === 'SOFT'))
            const v = next.vehicles[id]
            if (hard.length) {
              const reasons = hard.map((g) => `[${g.code}] ${g.title} — ${g.reason}`)
              excluded.push({ vehicleId: id, reasons })
              next.vehicles[id] = { ...v, stage: 'SALE_REGISTERED', shipmentId: undefined }
              logs.push({
                vehicleId: id,
                shipmentId,
                action: '선적 제외',
                actorId: currentUserId,
                prevStage: 'IN_SLIP',
                nextStage: 'SALE_REGISTERED',
                reason: hard.map((g) => `${g.code} ${g.title}`).join(', '),
              })
            } else {
              shipped.push(id)
              next.vehicles[id] = { ...v, stage: 'SHIPPED' }
              logs.push({
                vehicleId: id,
                shipmentId,
                action: '선적 완료',
                actorId: currentUserId,
                prevStage: 'IN_SLIP',
                nextStage: 'SHIPPED',
                reason: `${s.vessel} ${s.voyage}`,
              })
            }
          }

          next = { ...next, shipments: { ...next.shipments, [shipmentId]: { ...s, status: 'SHIPPED', shippedAt: at, excluded } } }
          const plates = (ids: string[]) => ids.map((id) => data.vehicles[id].plateNumber).join(', ')
          commit(
            next,
            logs,
            excluded.length
              ? [
                  {
                    severity: 'error',
                    title: `선적 차단 ${excluded.length}대`,
                    message: `${s.slipNo} · ${plates(excluded.map((e) => e.vehicleId))} — ${excluded.map((e) => e.reasons[0].split(' — ')[0]).join(', ')}`,
                    link: `/shipments?id=${shipmentId}`,
                    roles: ['ACCOUNTING', 'SALES'],
                  },
                ]
              : [],
          )
          return { ...ok(shipmentId), shipped, excluded }
        },

        decideRelease: (releaseId, approve, note) => {
          const denied = deny('DECIDE_RELEASE')
          if (denied) return denied
          const { data, currentUserId } = get()
          const r = data.releases.find((x) => x.id === releaseId)
          if (!r || r.status !== 'PENDING') return fail('결재 대기 중인 요청이 아닙니다.')
          if (!approve && !note.trim()) return fail('반려 사유를 입력해 주세요.')
          if (approve) {
            // 요청 이후 차단 항목이 생겼으면 승인할 수 없다 (예: VIN 재조회에서 압류 확인)
            const hard = evaluateGates(r.vehicleId, data).filter((g) => g.severity === 'HARD')
            if (hard.length) return fail(`차단 항목이 있어 승인할 수 없습니다: ${hard.map((g) => `[${g.code}] ${g.title}`).join(', ')}`)
          }
          const decisionNote = note.trim() || `보완 기한 ${formatDate(r.dueDate)} 엄수`
          commit(
            {
              ...data,
              releases: data.releases.map((x) =>
                x.id === releaseId ? { ...x, status: approve ? 'APPROVED' : 'REJECTED', decidedBy: currentUserId, decidedAt: nowStamp(), decisionNote } : x,
              ),
            },
            [{ vehicleId: r.vehicleId, action: approve ? '조건부 선적 승인' : '조건부 선적 반려', actorId: currentUserId, reason: decisionNote }],
            [
              {
                severity: approve ? 'success' : 'warning',
                title: approve ? '조건부 선적 승인' : '조건부 선적 반려',
                message: `${data.vehicles[r.vehicleId].plateNumber} · ${decisionNote}`,
                link: `/vehicles/${r.vehicleId}`,
                roles: [],
                userIds: [r.requestedBy],
                vehicleId: r.vehicleId,
              },
            ],
          )
          return ok(releaseId)
        },
      }
    },
    {
      // 새로고침해도 시연 중 변경이 유지되도록 탭 단위(sessionStorage)로 저장
      name: 'k-auto-demo',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ data: s.data, currentUserId: s.currentUserId }),
    },
  ),
)

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

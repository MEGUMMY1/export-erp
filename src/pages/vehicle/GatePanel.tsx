import { Link } from 'react-router'
import { Panel } from '@/components/domain/Panel'
import { GateLabel } from '@/components/domain/RiskChip'
import { Button } from '@/components/ui'
import { ACKNOWLEDGEABLE, ROLE_LABEL } from '@/domain/constants'
import { formatKRW } from '@/domain/format'
import { can, type Permission } from '@/domain/rules'
import type { GateResult, NextAction, Role } from '@/domain/types'

export type GateActionKind =
  | 'UPLOAD'
  | 'VERIFY'
  | 'RECHECK'
  | 'HANDOVER'
  | 'CORRECT_DECL'
  | 'ACCEPT_DECL'
  | 'ACKNOWLEDGE'
  | 'FIX_SALE'
  | 'RELEASE'

interface ActionDef {
  kind: GateActionKind
  label: string
  permission: Permission
}

const ACTIONS: Partial<Record<NextAction, ActionDef>> = {
  UPLOAD_EVIDENCE: { kind: 'UPLOAD', label: '증빙 올리기', permission: 'UPLOAD_EVIDENCE' },
  VERIFY_EVIDENCE: { kind: 'VERIFY', label: '증빙 검증하기', permission: 'VERIFY_EVIDENCE' },
  RECHECK_VIN: { kind: 'RECHECK', label: 'VIN 재조회', permission: 'RECHECK_VIN' },
  UPLOAD_RELEASE_PROOF: { kind: 'RECHECK', label: '해제 후 재조회', permission: 'RECHECK_VIN' },
  HANDOVER: { kind: 'HANDOVER', label: '인수 처리', permission: 'HANDOVER' },
  CORRECT_DECL: { kind: 'CORRECT_DECL', label: '정정 후 재대조', permission: 'FIX_EXPORT' },
  ACCEPT_DECL: { kind: 'ACCEPT_DECL', label: '수리 확인', permission: 'FIX_EXPORT' },
  ACKNOWLEDGE: { kind: 'ACKNOWLEDGE', label: '회계 확인', permission: 'ACKNOWLEDGE_GATE' },
  FIX_SALE: { kind: 'FIX_SALE', label: '통관 정보 보완', permission: 'FIX_EXPORT' },
  CONDITIONAL_RELEASE: { kind: 'RELEASE', label: '조건부 선적 요청', permission: 'REQUEST_RELEASE' },
}

/** 역할에 맞는 해소 액션 — 회계는 S4·S5·S8을 직접 확인으로 해소할 수 있다 */
function actionFor(gate: GateResult, role: Role): ActionDef | undefined {
  if (role === 'ACCOUNTING' && ACKNOWLEDGEABLE.includes(gate.code)) return ACTIONS.ACKNOWLEDGE
  return ACTIONS[gate.nextAction]
}

interface Props {
  gates: GateResult[]
  role: Role
  onAction: (kind: GateActionKind, gate: GateResult) => void
  /** 지금 실행할 수 없는 액션과 그 사유 (예: 압류 차량의 인수 처리) */
  blockedActions?: Partial<Record<GateActionKind, string>>
}

/** 게이트 판정 — 왜 막혔는지, 누가 무엇을 하면 풀리는지 */
export function GatePanel({ gates, role, onAction, blockedActions = {} }: Props) {
  const hard = gates.filter((g) => g.severity === 'HARD').length
  return (
    <Panel
      title="리스크 게이트 판정"
      actions={
        <>
          <span className="text-caption-md text-gray-70">
            차단 {hard} · 보완 {gates.length - hard}
          </span>
          <Link to="/guide" className="text-caption-md text-brand-70 hover:underline">
            판정 기준 보기
          </Link>
        </>
      }
    >
      {gates.length === 0 ? (
        <p className="text-body-md text-green-60">모든 검증을 통과했습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-20">
          {gates.map((g) => {
            const action = actionFor(g, role)
            const allowed = action && can(role, action.permission)
            return (
              <li key={g.code} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <GateLabel gate={g} />
                    <span className="text-caption-sm text-gray-70">
                      {g.severity === 'HARD' ? '우회 불가' : '조건부 선적 가능'} · 담당 {ROLE_LABEL[g.ownerRole]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-body-md text-gray-90">{g.reason}</p>
                  {g.vatImpact != null && g.vatImpact > 0 && (
                    <p className="mt-0.5 text-caption-md text-orange-60">증빙 미확보 예상 금액 {formatKRW(g.vatImpact)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                  {g.nextAction === 'STOP_DEAL' ? (
                    <span className="text-caption-md text-red-60">거래 중단 대상</span>
                  ) : action && allowed ? (
                    <>
                      <Button
                        variant={g.severity === 'HARD' ? 'outlined-red' : 'outlined'}
                        size="sm"
                        disabled={!!blockedActions[action.kind]}
                        onClick={() => onAction(action.kind, g)}
                      >
                        {action.label}
                      </Button>
                      {blockedActions[action.kind] && <span className="text-caption-sm text-gray-70">{blockedActions[action.kind]}</span>}
                    </>
                  ) : (
                    <span className="text-caption-md text-gray-50">{ROLE_LABEL[g.ownerRole]} 담당 처리</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

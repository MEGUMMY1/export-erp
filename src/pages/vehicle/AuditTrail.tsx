import { Panel } from '@/components/domain/Panel'
import { ROLE_LABEL, STAGE_LABEL } from '@/domain/constants'
import { formatDateTime } from '@/domain/format'
import type { ErpData } from '@/domain/types'

/** 처리 이력 — "왜 이 차량이 선적 승인을 받았지?"에 답한다 */
export function AuditTrail({ vehicleId, data }: { vehicleId: string; data: ErpData }) {
  // 최신순. 같은 시각에 남은 로그도 나중에 기록된 것이 위로 오도록 먼저 뒤집는다
  const logs = data.auditLogs
    .filter((l) => l.vehicleId === vehicleId)
    .reverse()
    .sort((a, b) => b.at.localeCompare(a.at))
  const user = (id: string) => data.users.find((u) => u.id === id)

  return (
    <Panel title="처리 이력 (Audit Trail)" actions={<span className="text-caption-md text-gray-70">{logs.length}건</span>}>
      <ol className="relative flex flex-col gap-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-gray-30">
        {logs.map((l) => {
          const u = user(l.actorId)
          return (
            <li key={l.id} className="relative pl-6">
              <span className="absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-white bg-brand-60" />
              <p className="text-body-md-m text-gray-90">{l.action}</p>
              <p className="text-caption-md text-gray-70">
                {formatDateTime(l.at)} · {u ? `${u.name} (${ROLE_LABEL[u.role]})` : l.actorId}
              </p>
              {l.nextStage && (
                <p className="text-caption-md text-brand-60">
                  {l.prevStage ? `${STAGE_LABEL[l.prevStage]} → ` : ''}
                  {STAGE_LABEL[l.nextStage]}
                </p>
              )}
              {l.reason && <p className="mt-0.5 text-caption-md text-gray-80">{l.reason}</p>}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

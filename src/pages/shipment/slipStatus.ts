import type { ChipTone } from '@/components/ui'
import type { ShipmentStatus } from '@/domain/types'

export const SLIP_STATUS: Record<ShipmentStatus, { tone: ChipTone; label: string }> = {
  PENDING: { tone: 'progress', label: '결재 대기' },
  APPROVED: { tone: 'success', label: '결재 승인' },
  REJECTED: { tone: 'default', label: '반려' },
  SHIPPED: { tone: 'dark', label: '선적 완료' },
}

import { useMemo } from 'react'
import { create } from 'zustand'
import { evaluateAll } from '../domain/rules'
import type { ErpData, User } from '../domain/types'
import { loadMockData } from '../mock'

// 매입·차량·선적 공유 상태. 업무 액션은 화면을 구현하면서 추가한다.
interface ErpState {
  data: ErpData
  currentUserId: string
  setCurrentUser: (userId: string) => void
}

export const useErpStore = create<ErpState>()((set) => ({
  data: loadMockData(),
  currentUserId: 'U-ACC',
  setCurrentUser: (currentUserId) => set({ currentUserId }),
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

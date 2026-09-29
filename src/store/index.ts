import { create } from 'zustand'

// 매입/차량/선적 공유 상태 — 기획 확정 후 슬라이스 정의 예정
type AppState = Record<string, never>

export const useAppStore = create<AppState>()(() => ({}))

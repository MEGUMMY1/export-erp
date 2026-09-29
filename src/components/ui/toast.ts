import { create } from 'zustand'

export type ToastType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (type: ToastType, message: string) => void
  dismiss: (id: number) => void
}

const DURATION_MS = 3000
let seq = 0

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (type, message) => {
    const id = ++seq
    set({ toasts: [...get().toasts, { id, type, message }] })
    setTimeout(() => get().dismiss(id), DURATION_MS)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

const show = (type: ToastType) => (message: string) => useToastStore.getState().push(type, message)

// 컴포넌트 밖(스토어 액션 등)에서도 호출 가능
export const toast = {
  success: show('success'),
  warning: show('warning'),
  error: show('error'),
  info: show('info'),
  neutral: show('neutral'),
}

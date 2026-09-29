import { useEffect } from 'react'
import { create } from 'zustand'

interface PageTitle {
  title: string
  description?: string
}

export const usePageTitleStore = create<PageTitle>()(() => ({ title: '' }))

/** 각 화면에서 호출하면 상단 헤더에 제목·설명이 표시된다 */
export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    usePageTitleStore.setState({ title, description })
  }, [title, description])
}

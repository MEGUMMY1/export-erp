import { usePageTitle } from '@/components/layout/pageTitle'

// 임시: 아직 구현하지 않은 화면
export function ComingSoon({ title }: { title: string }) {
  usePageTitle(title)
  return (
    <section className="rounded-xl border border-gray-30 bg-white p-10 text-center">
      <p className="text-body-md text-gray-70">구현 예정</p>
    </section>
  )
}

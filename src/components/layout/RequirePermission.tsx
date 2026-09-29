import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { can, permissionHint, type Permission } from '@/domain/rules'
import { useCurrentUser } from '@/store'
import { usePageTitle } from './pageTitle'

/**
 * 등록 화면 접근 제한 — 권한이 없는 역할은 입력 폼 대신 안내만 본다.
 * 조회 화면은 협업을 위해 열어 두고, 쓰기는 버튼 비활성화 + 스토어 저장 시점 재검증으로 막는다.
 */
export function RequirePermission({ permission, title, children }: { permission: Permission; title: string; children: ReactNode }) {
  const user = useCurrentUser()
  if (can(user.role, permission)) return children
  return <NoPermission permission={permission} title={title} />
}

function NoPermission({ permission, title }: { permission: Permission; title: string }) {
  usePageTitle(title)
  return (
    <div className="rounded-xl border border-dashed border-gray-40 px-5 py-16 text-center">
      <p className="text-body-md-m text-gray-80">{title}은 {permissionHint(permission)}이 있어야 할 수 있습니다.</p>
      <p className="mt-1 text-caption-md text-gray-70">
        좌측 하단에서 시연 사용자를 바꾸거나,{' '}
        <Link to="/workbench" className="text-brand-70 hover:underline">
          업무 현황
        </Link>
        으로 돌아가세요.
      </p>
    </div>
  )
}

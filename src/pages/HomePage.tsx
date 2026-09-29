import { useEffect, useState } from 'react'
import { Button, Chip, Modal, toast } from '../components/ui'

// 임시: 공통 컴포넌트 확인용 (?modal=text|content, ?toast 로 바로 확인). 화면 구현 시 교체
const params = new URLSearchParams(window.location.search)

function HomePage() {
  const [open, setOpen] = useState(params.get('modal') as 'text' | 'content' | null)
  const close = () => setOpen(null)

  useEffect(() => {
    if (!params.has('toast')) return
    toast.success('매입 확정 완료')
    toast.warning('세금계산서 미수취')
    toast.error('선적 차단: VIN 압류')
    toast.info('결재 요청을 보냈습니다')
    toast.neutral('임시 저장됨')
  }, [])

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-title-lg">스마트 중고차 수출 ERP</h1>

      <section className="space-y-3">
        <h2 className="text-subtitle-md">Chip</h2>
        <div className="flex flex-wrap gap-2">
          <Chip tone="success" dot>정상</Chip>
          <Chip tone="warning" dot>보완</Chip>
          <Chip tone="error" dot>차단</Chip>
          <Chip tone="progress">결재 대기</Chip>
          <Chip tone="waiting">매입 등록</Chip>
          <Chip tone="scheduled">선적 예정</Chip>
          <Chip tone="dark">종결</Chip>
          <Chip>기본</Chip>
          <Chip tone="error" size="lg" dot>VIN 압류</Chip>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-subtitle-md">Button</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg">매입 확정</Button>
          <Button>선적 전표 담기</Button>
          <Button size="sm">재조회</Button>
          <Button disabled>선적 처리</Button>
          <Button variant="outlined">조건부 선적 요청</Button>
          <Button variant="outlined-gray">취소</Button>
          <Button variant="outlined-red">반려</Button>
          <Button variant="outlined" disabled>비활성</Button>
          <Button variant="text">자세히</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-subtitle-md">Toast · Modal</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outlined-gray" size="sm" onClick={() => toast.success('매입 확정 완료')}>success</Button>
          <Button variant="outlined-gray" size="sm" onClick={() => toast.warning('세금계산서 미수취')}>warning</Button>
          <Button variant="outlined-gray" size="sm" onClick={() => toast.error('선적 차단: VIN 압류')}>error</Button>
          <Button variant="outlined-gray" size="sm" onClick={() => toast.info('결재 요청을 보냈습니다')}>info</Button>
          <Button variant="outlined-gray" size="sm" onClick={() => toast.neutral('임시 저장됨')}>neutral</Button>
          <Button variant="outlined" size="sm" onClick={() => setOpen('text')}>Text 모달</Button>
          <Button variant="outlined" size="sm" onClick={() => setOpen('content')}>Content 모달</Button>
        </div>
      </section>

      <Modal
        open={open === 'text'}
        onClose={close}
        title="매입을 확정할까요?"
        description="확정 후에는 판매 등록에서 이 차량을 선택할 수 있습니다."
        cancel={{ label: '취소', onClick: close }}
        confirm={{ label: '확정', onClick: close }}
      />
      <Modal
        open={open === 'content'}
        onClose={close}
        title="조건부 선적 결재"
        showClose
        footer={
          <>
            <Button variant="outlined-red" size="lg" className="flex-1" onClick={close}>반려</Button>
            <Button size="lg" className="flex-1" onClick={close}>승인</Button>
          </>
        }
      >
        <div className="rounded-lg bg-gray-20 p-4 text-body-sm">보완 항목 · 기한 · 책임자 · 예상 부가세 영향</div>
      </Modal>
    </main>
  )
}

export default HomePage

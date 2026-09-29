import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from './components/ui'
import { ComingSoon } from './pages/ComingSoon'
import { WorkbenchPage } from './pages/workbench/WorkbenchPage'

function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
          <Route path="/purchases/new" element={<ComingSoon title="매입 등록" />} />
          <Route path="/sales/new" element={<ComingSoon title="판매 등록" />} />
          <Route path="/shipments" element={<ComingSoon title="선적 전표 · 결재" />} />
          <Route path="/vehicles/:id" element={<ComingSoon title="차량 상세" />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App

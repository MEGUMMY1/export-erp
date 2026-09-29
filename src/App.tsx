import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from './components/ui'
import { ComingSoon } from './pages/ComingSoon'
import { PurchasePage } from './pages/purchase/PurchasePage'
import { SalePage } from './pages/sale/SalePage'
import { VehicleDetailPage } from './pages/vehicle/VehicleDetailPage'
import { WorkbenchPage } from './pages/workbench/WorkbenchPage'

function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
          <Route path="/purchases/new" element={<PurchasePage />} />
          <Route path="/sales/new" element={<SalePage />} />
          <Route path="/shipments" element={<ComingSoon title="선적 전표 · 결재" />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App

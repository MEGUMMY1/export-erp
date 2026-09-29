import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from './components/ui'
import { GuidePage } from './pages/guide/GuidePage'
import { PurchasePage } from './pages/purchase/PurchasePage'
import { SalePage } from './pages/sale/SalePage'
import { ShipmentsPage } from './pages/shipment/ShipmentsPage'
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
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App

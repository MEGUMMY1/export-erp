import { Route, Routes } from 'react-router'
import { Toaster } from './components/ui'
import HomePage from './pages/HomePage.tsx'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App

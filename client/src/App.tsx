import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardSeguridad from './pages/DashboardSeguridad'
import DashboardRecursos from './pages/DashboardRecursos'
import DashboardDisponibilidad from './pages/DashboardDisponibilidad'
import DashboardInventarioFisico from './pages/DashboardInventarioFisico'
import DashboardResponsables from './pages/DashboardResponsables'
import Inventory from './pages/Inventory'
import InventarioFisico from './pages/InventarioFisico'
import InventoryCloud from './pages/InventoryCloud'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import Layout from './components/layout/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="seguridad" element={<DashboardSeguridad />} />
          <Route path="recursos" element={<DashboardRecursos />} />
          <Route path="disponibilidad" element={<DashboardDisponibilidad />} />
          <Route path="inventario-fisico-detalle" element={<DashboardInventarioFisico />} />
          <Route path="responsables" element={<DashboardResponsables />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventario-cloud" element={<InventoryCloud />} />
          <Route path="inventario-fisico" element={<InventarioFisico />} />
          <Route path="reports" element={<Reports />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App

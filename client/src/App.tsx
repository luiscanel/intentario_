import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Layout from './components/layout/Layout'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getMe } from './lib/api'

// Lazy loading para todas las páginas
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DashboardSeguridad = lazy(() => import('./pages/DashboardSeguridad'))
const DashboardRecursos = lazy(() => import('./pages/DashboardRecursos'))
const DashboardDisponibilidad = lazy(() => import('./pages/DashboardDisponibilidad'))
const DashboardResponsables = lazy(() => import('./pages/DashboardResponsables'))
const Inventory = lazy(() => import('./pages/Inventory'))
const InventarioFisico = lazy(() => import('./pages/InventarioFisico'))
const InventoryCloud = lazy(() => import('./pages/InventoryCloud'))
const Reports = lazy(() => import('./pages/Reports'))
const Admin = lazy(() => import('./pages/Admin'))
const Proveedores = lazy(() => import('./pages/Proveedores'))
const Licencias = lazy(() => import('./pages/Licencias'))
const Contratos = lazy(() => import('./pages/Contratos'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Monitor = lazy(() => import('./pages/Monitor'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const Certificados = lazy(() => import('./pages/Certificados'))
const Cambios = lazy(() => import('./pages/Cambios'))
const Backups = lazy(() => import('./pages/Backups'))

// Componente de carga
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getMe()
        if (user) {
          login(user)
        }
      } catch {
        // No hay sesión válida
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [login])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="seguridad" element={<Suspense fallback={<PageLoader />}><DashboardSeguridad /></Suspense>} />
          <Route path="recursos" element={<Suspense fallback={<PageLoader />}><DashboardRecursos /></Suspense>} />
          <Route path="disponibilidad" element={<Suspense fallback={<PageLoader />}><DashboardDisponibilidad /></Suspense>} />
          <Route path="responsables" element={<Suspense fallback={<PageLoader />}><DashboardResponsables /></Suspense>} />
          <Route path="inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="inventario-cloud" element={<Suspense fallback={<PageLoader />}><InventoryCloud /></Suspense>} />
          <Route path="inventario-fisico" element={<Suspense fallback={<PageLoader />}><InventarioFisico /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
          <Route path="proveedores" element={<Suspense fallback={<PageLoader />}><Proveedores /></Suspense>} />
          <Route path="licencias" element={<Suspense fallback={<PageLoader />}><Licencias /></Suspense>} />
          <Route path="contratos" element={<Suspense fallback={<PageLoader />}><Contratos /></Suspense>} />
          <Route path="alertas" element={<Suspense fallback={<PageLoader />}><Alertas /></Suspense>} />
          <Route path="monitor" element={<Suspense fallback={<PageLoader />}><Monitor /></Suspense>} />
          <Route path="audit-log" element={<Suspense fallback={<PageLoader />}><AuditLog /></Suspense>} />
          <Route path="certificados" element={<Suspense fallback={<PageLoader />}><Certificados /></Suspense>} />
          <Route path="cambios" element={<Suspense fallback={<PageLoader />}><Cambios /></Suspense>} />
          <Route path="backups" element={<Suspense fallback={<PageLoader />}><Backups /></Suspense>} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App

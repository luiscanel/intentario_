import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Search, LayoutDashboard, Server, HardDrive, FileText, Users, LogOut, Menu, Shield, Cpu, Activity, User, Cloud, ChevronRight, Key } from 'lucide-react'
import { changePassword } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const modulos = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', permiso: null },
  { to: '/inventory', icon: Server, label: 'Inv. Onpremise', permiso: { modulo: 'inventario_servidores', accion: 'ver' } },
  { to: '/inventario-cloud', icon: Cloud, label: 'Inv. Cloud', permiso: { modulo: 'inventario_cloud', accion: 'ver' } },
  { to: '/inventario-fisico', icon: HardDrive, label: 'Inventario Físico', permiso: { modulo: 'inventario_fisico', accion: 'ver' } },
  { to: '/seguridad', icon: Shield, label: 'Seguridad', permiso: null },
  { to: '/recursos', icon: Cpu, label: 'Recursos', permiso: null },
  { to: '/disponibilidad', icon: Activity, label: 'Disponibilidad', permiso: null },
  { to: '/inventario-fisico-detalle', icon: HardDrive, label: 'Inv. Físico Detalle', permiso: { modulo: 'inventario_fisico', accion: 'ver' } },
  { to: '/responsables', icon: User, label: 'Responsables', permiso: null },
  { to: '/reports', icon: FileText, label: 'Informes', permiso: { modulo: 'informes', accion: 'ver' } },
  { to: '/admin', icon: Users, label: 'Admin', permiso: { modulo: 'admin', accion: 'ver' } },
]

export default function Layout() {
  const { user, logout, permisos, tienePermiso } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const { toast } = useToast()

  const navItems = permisos.length > 0 
    ? modulos.filter(m => !m.permiso || tienePermiso(m.permiso.modulo, m.permiso.accion))
    : modulos

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden' })
      return
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast({ title: 'Contraseña actualizada correctamente' })
      setPasswordDialogOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-mesh">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-slate-900/95 backdrop-blur-xl text-white 
        transition-all duration-300 ease-out
        border-r border-slate-700/50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-20 px-6 flex items-center justify-center border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Inventario</span>
              <span className="font-bold text-lg text-blue-400"> Almo</span>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`
              }
              end={item.to === '/'}
            >
              <div className={`p-2 rounded-lg ${true ? 'bg-slate-800/50' : ''} group-hover:bg-slate-700/50 transition-colors`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium">{item.label}</span>
              {true && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:ml-72">
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex-1" />
          
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar servidores, inventario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-72 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-2 pr-4 border-r">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 cursor-pointer" onClick={() => setPasswordDialogOpen(true)}>
                <span className="text-sm font-semibold text-white">
                  {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-700">{user?.nombre}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Cambiar Contraseña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contraseña Actual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingrese su contraseña actual"
              />
            </div>
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nueva Contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
  getRoles, createRol, updateRol, deleteRol,
  getPermisos, getModulos, createModulo, updateModulo, deleteModulo,
  getBackups, createBackup, restoreBackup, deleteBackup, downloadBackup,
  resetPassword
} from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Users, Plus, Shield, Trash2, Edit, Mail, Send, Save, TestTube, CheckCircle, XCircle, Database, Download, RotateCcw, AlertTriangle } from 'lucide-react'
import type { Usuario } from '@/types/api'

// Tipos locales
interface Modulo {
  id: number
  nombre: string
  descripcion: string
  icono: string
  orden: number
  activo: boolean
  permisos: any[]
  roles: any[]
}

interface Rol {
  id: number
  nombre: string
  descripcion: string
  esBase: boolean
  usuariosCount: number
  modulos: Modulo[]
}

interface PermisoData {
  modulos: Modulo[]
  grouped: Record<string, any[]>
}

interface EmailConfig {
  host: string
  puerto: string
  usuario: string
  contrasena: string
  usandoTls: boolean
  emailFrom: string
  activo: boolean
}

interface Backup {
  name: string
  size: number
  sizeFormatted: string
  createdAt: string
  path: string
}

export default function Admin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<PermisoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'usuarios' | 'modulos' | 'roles' | 'email' | 'backups'>('usuarios')
  
  // Email state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: '',
    puerto: '587',
    usuario: '',
    contrasena: '',
    usandoTls: true,
    emailFrom: '',
    activo: true
  })
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  
  // Backup state
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null)
  
  // Dialogs
  const [isUsuarioDialogOpen, setIsUsuarioDialogOpen] = useState(false)
  const [isRolDialogOpen, setIsRolDialogOpen] = useState(false)
  const [isModuloDialogOpen, setIsModuloDialogOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [editingRol, setEditingRol] = useState<Rol | null>(null)
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null)
  
  // Forms
  const [usuarioForm, setUsuarioForm] = useState({
    email: '',
    nombre: '',
    password: '',
    rolIds: [] as number[],
    activo: true
  })
  
  const [rolForm, setRolForm] = useState({
    nombre: '',
    descripcion: '',
    moduloIds: [] as number[]
  })

  const [moduloForm, setModuloForm] = useState({
    nombre: '',
    descripcion: '',
    icono: 'Circle',
    orden: 0
  })
  
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    loadEmailConfig()
  }, [])

  const loadData = async () => {
    try {
      const [usuariosData, modulosData, rolesData, permisosData] = await Promise.all([
        getUsuarios(),
        getModulos(),
        getRoles(),
        getPermisos()
      ])
      setUsuarios(usuariosData)
      setModulos(modulosData)
      setRoles(rolesData)
      setPermisos(permisosData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ========================
  // EMAIL
  // ========================
  const loadEmailConfig = async () => {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/email/config')
      const data = await res.json()
      if (data) {
        setEmailConfig(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailSaving(true)
    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      })
      if (res.ok) {
        toast({ title: 'Configuración guardada correctamente' })
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración' })
    } finally {
      setEmailSaving(false)
    }
  }

  const handleEmailTest = async () => {
    if (!testEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese un email de prueba' })
      return
    }
    setEmailTesting(true)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Email de prueba enviado', description: 'Revise su bandeja de entrada' })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setEmailTesting(false)
    }
  }

  const handleSendReport = async () => {
    if (!testEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese el destinatario' })
      return
    }
    setSendingReport(true)
    try {
      const res = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Informe enviado', description: 'El informe se envió correctamente' })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setSendingReport(false)
    }
  }

  // ========================
  // USUARIOS
  // ========================
  
  const handleUsuarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!usuarioForm.email.toLowerCase().endsWith('@grupoalmo.com')) {
      toast({ variant: 'destructive', title: 'Error', description: 'Solo se permiten correos con dominio @grupoalmo.com' })
      return
    }

    try {
      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, {
          nombre: usuarioForm.nombre,
          rolIds: usuarioForm.rolIds,
          activo: usuarioForm.activo,
          password: usuarioForm.password || undefined
        })
        toast({ title: 'Usuario actualizado correctamente' })
      } else {
        const result: any = await createUsuario({
          email: usuarioForm.email,
          nombre: usuarioForm.nombre,
          password: usuarioForm.password,
          rolIds: usuarioForm.rolIds,
          activo: usuarioForm.activo,
          enviarInvitacion: true
        })
        toast({ 
          title: result?.invitacionEnviada ? 'Usuario creado e invitación enviada' : 'Usuario creado correctamente'
        })
      }
      setIsUsuarioDialogOpen(false)
      resetUsuarioForm()
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  // ========================
  // BACKUP
  // ========================
  const loadBackups = async () => {
    setBackupsLoading(true)
    try {
      const data = await getBackups()
      setBackups(data)
    } catch (error: any) {
      console.error('Error:', error)
    } finally {
      setBackupsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const res = await createBackup()
      if (res.success) {
        toast({ title: 'Backup creado correctamente' })
        loadBackups()
      } else {
        throw new Error(res.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async () => {
    if (!backupToRestore) return
    setRestoringBackup(true)
    try {
      const res = await restoreBackup(backupToRestore.name)
      if (res.success) {
        toast({ title: 'Restauración exitosa', description: res.message })
        setBackupToRestore(null)
      } else {
        throw new Error(res.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setRestoringBackup(false)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('¿Estás seguro de eliminar este backup?')) return
    
    try {
      await deleteBackup(filename)
      toast({ title: 'Backup eliminado' })
      loadBackups()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const blob = await downloadBackup(backup.name)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backup.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDeleteUsuario = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    
    try {
      await deleteUsuario(id)
      toast({ title: 'Usuario eliminado' })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleResetPassword = async (userId: number, userName: string) => {
    if (!confirm(`¿Resetear contraseña de ${userName}? Se le enviará una contraseña temporal por correo.`)) return
    
    try {
      const res = await resetPassword(userId)
      toast({ 
        title: res.message,
        description: res.warning
      })
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const openUsuarioDialog = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario)
      const rolIds = (usuario as any).roles?.map((r: any) => r.id) || []
      setUsuarioForm({
        email: usuario.email,
        nombre: usuario.nombre,
        password: '',
        rolIds,
        activo: usuario.activo
      })
    } else {
      resetUsuarioForm()
    }
    setIsUsuarioDialogOpen(true)
  }

  const resetUsuarioForm = () => {
    setEditingUsuario(null)
    setUsuarioForm({ email: '', nombre: '', password: '', rolIds: [], activo: true })
  }

  const toggleUsuarioRol = (rolId: number) => {
    setUsuarioForm(prev => ({
      ...prev,
      rolIds: prev.rolIds.includes(rolId)
        ? prev.rolIds.filter(id => id !== rolId)
        : [...prev.rolIds, rolId]
    }))
  }

  // ========================
  // ROLES
  // ========================

  const handleRolSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rolForm.nombre) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del rol es requerido' })
      return
    }

    try {
      if (editingRol) {
        await updateRol(editingRol.id, {
          nombre: rolForm.nombre,
          descripcion: rolForm.descripcion,
          moduloIds: rolForm.moduloIds
        })
        toast({ title: 'Rol actualizado correctamente' })
      } else {
        await createRol({
          nombre: rolForm.nombre,
          descripcion: rolForm.descripcion,
          moduloIds: rolForm.moduloIds
        })
        toast({ title: 'Rol creado correctamente' })
      }
      setIsRolDialogOpen(false)
      resetRolForm()
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDeleteRol = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return
    
    try {
      await deleteRol(id)
      toast({ title: 'Rol eliminado' })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const openRolDialog = (rol?: Rol) => {
    if (rol) {
      setEditingRol(rol)
      setRolForm({
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        moduloIds: rol.modulos?.map(m => m.id) || []
      })
    } else {
      resetRolForm()
    }
    setIsRolDialogOpen(true)
  }

  const resetRolForm = () => {
    setEditingRol(null)
    setRolForm({ nombre: '', descripcion: '', moduloIds: [] })
  }

  // ========================
  // MÓDULOS
  // ========================
  const handleSaveModulo = async () => {
    try {
      if (editingModulo) {
        await updateModulo(editingModulo.id, moduloForm)
        toast({ title: 'Módulo actualizado' })
      } else {
        await createModulo(moduloForm)
        toast({ title: 'Módulo creado' })
      }
      setIsModuloDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDeleteModulo = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este módulo?')) return
    try {
      await deleteModulo(id)
      toast({ title: 'Módulo eliminado' })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const openModuloDialog = (modulo?: Modulo) => {
    if (modulo) {
      setEditingModulo(modulo)
      setModuloForm({
        nombre: modulo.nombre,
        descripcion: modulo.descripcion || '',
        icono: modulo.icono || 'Circle',
        orden: modulo.orden || 0
      })
    } else {
      setEditingModulo(null)
      setModuloForm({ nombre: '', descripcion: '', icono: 'Circle', orden: 0 })
    }
    setIsModuloDialogOpen(true)
  }

  // ========================
  // HELPERS
  // ========================

  const getRolLabel = (rol: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      gerencia: 'Gerencia',
      redes: 'Redes',
      soporte: 'Soporte',
      infra: 'Infraestructura',
      base_datos: 'Base de Datos'
    }
    return labels[rol] || rol
  }

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'gerencia': return 'bg-yellow-100 text-yellow-800'
      case 'redes': return 'bg-blue-100 text-blue-800'
      case 'soporte': return 'bg-green-100 text-green-800'
      case 'infra': return 'bg-orange-100 text-orange-800'
      case 'base_datos': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración</h1>
          <p className="text-muted-foreground">Gestiona usuarios y roles del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'usuarios' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users className="w-4 h-4 mr-2" />
          Usuarios ({usuarios.length})
        </Button>
        <Button
          variant={activeTab === 'modulos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('modulos')}
        >
          <Shield className="w-4 h-4 mr-2" />
          Módulos ({modulos.length})
        </Button>
        <Button
          variant={activeTab === 'roles' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('roles')}
        >
          <Shield className="w-4 h-4 mr-2" />
          Roles ({roles.length})
        </Button>
        <Button
          variant={activeTab === 'email' ? 'default' : 'ghost'}
          onClick={() => { setActiveTab('email'); loadEmailConfig(); }}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email
        </Button>
        <Button
          variant={activeTab === 'backups' ? 'default' : 'ghost'}
          onClick={() => { setActiveTab('backups'); loadBackups(); }}
        >
          <Database className="w-4 h-4 mr-2" />
          Backups
        </Button>
      </div>

      {/* USUARIOS TAB */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openUsuarioDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nombre}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(usuario as any).roles?.map((r: any) => (
                            <span key={r.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRolColor(r.nombre)}`}>
                              {r.nombre}
                            </span>
                          )) || <span className="text-muted-foreground">Sin rol</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(usuario.createdAt).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => openUsuarioDialog(usuario)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleResetPassword(usuario.id, usuario.nombre)} title="Resetear contraseña">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteUsuario(usuario.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MÓDULOS TAB */}
      {activeTab === 'modulos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openModuloDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Módulo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((modulo) => (
              <Card key={modulo.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{modulo.nombre}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModuloDialog(modulo)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => handleDeleteModulo(modulo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{modulo.descripcion}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={modulo.activo ? 'text-green-600' : 'text-red-600'}>
                      {modulo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span>•</span>
                    <span>Orden: {modulo.orden}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {modulo.permisos?.slice(0, 5).map((p: any) => (
                      <span key={p.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {p.accion}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openRolDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Rol
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((rol) => (
              <Card key={rol.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{getRolLabel(rol.nombre)}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openRolDialog(rol)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        disabled={rol.usuariosCount > 0}
                        onClick={() => handleDeleteRol(rol.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{rol.descripcion}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{rol.usuariosCount} usuario{rol.usuariosCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rol.modulos?.slice(0, 5).map((m: any) => (
                      <span key={m.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {m.nombre}
                      </span>
                    ))}
                    {rol.modulos?.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{rol.modulos.length - 5}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* EMAIL TAB */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {emailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SMTP Config */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Servidor SMTP
                  </CardTitle>
                  <CardDescription>
                    Configure los datos de su servidor de correo saliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Servidor SMTP (host)</Label>
                      <Input 
                        value={emailConfig.host}
                        onChange={(e) => setEmailConfig({...emailConfig, host: e.target.value})}
                        placeholder="smtp.gmail.com"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Puerto</Label>
                        <Input 
                          value={emailConfig.puerto}
                          onChange={(e) => setEmailConfig({...emailConfig, puerto: e.target.value})}
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Usuario</Label>
                        <Input 
                          value={emailConfig.usuario}
                          onChange={(e) => setEmailConfig({...emailConfig, usuario: e.target.value})}
                          placeholder="correo@dominio.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Contraseña</Label>
                      <Input 
                        type="password"
                        value={emailConfig.contrasena}
                        onChange={(e) => setEmailConfig({...emailConfig, contrasena: e.target.value})}
                        placeholder="••••••••"
                      />
                      <p className="text-xs text-gray-500">Deje en blanco para mantener la contraseña actual</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Remitente</Label>
                      <Input 
                        value={emailConfig.emailFrom}
                        onChange={(e) => setEmailConfig({...emailConfig, emailFrom: e.target.value})}
                        placeholder="inventario@grupoalmo.com"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="tls"
                        checked={emailConfig.usandoTls}
                        onChange={(e) => setEmailConfig({...emailConfig, usandoTls: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="tls" className="font-normal">Usar TLS/SSL</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="emailActivo"
                        checked={emailConfig.activo}
                        onChange={(e) => setEmailConfig({...emailConfig, activo: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="emailActivo" className="font-normal">Configuración activa</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={emailSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {emailSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Test & Send */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      Probar Configuración
                    </CardTitle>
                    <CardDescription>
                      Envíe un email de prueba para verificar la configuración
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email de prueba</Label>
                      <Input 
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="correo@dominio.com"
                      />
                    </div>
                    <Button 
                      onClick={handleEmailTest} 
                      variant="outline" 
                      className="w-full"
                      disabled={emailTesting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {emailTesting ? 'Enviando...' : 'Enviar Email de Prueba'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Enviar Informe
                    </CardTitle>
                    <CardDescription>
                      Envíe el inventario completo por email
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Destinatario</Label>
                      <Input 
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="destinatario@dominio.com"
                      />
                    </div>
                    <Button 
                      onClick={handleSendReport} 
                      className="w-full"
                      disabled={sendingReport}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendingReport ? 'Enviando...' : 'Enviar Informe de Inventario'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Status */}
          <Card className={emailConfig.activo ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
            <CardContent className="p-4 flex items-center gap-3">
              {emailConfig.activo ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Configuración de email activa</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Configuración de email inactiva</span>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* BACKUPS TAB */}
      {activeTab === 'backups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Gestión de Backups</h3>
              <p className="text-sm text-gray-500">Cree, restaure o elimine copias de seguridad de la base de datos</p>
            </div>
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              <Database className="w-4 h-4 mr-2" />
              {creatingBackup ? 'Creando...' : 'Crear Backup'}
            </Button>
          </div>

          {backupsLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando backups...</div>
          ) : backups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay backups disponibles</p>
                <p className="text-sm">Cree un backup para proteger sus datos</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.name}>
                        <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                        <TableCell>{backup.sizeFormatted}</TableCell>
                        <TableCell>{new Date(backup.createdAt).toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadBackup(backup)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBackupToRestore(backup)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteBackup(backup.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* USUARIO DIALOG */}
      <Dialog open={isUsuarioDialogOpen} onOpenChange={setIsUsuarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUsuarioSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input 
                  value={usuarioForm.nombre}
                  onChange={(e) => setUsuarioForm({...usuarioForm, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={usuarioForm.email}
                  onChange={(e) => setUsuarioForm({...usuarioForm, email: e.target.value})}
                  placeholder="usuario@grupoalmo.com"
                  required
                  disabled={!!editingUsuario}
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña {editingUsuario && '(opcional)'}</Label>
                <Input 
                  type="password"
                  value={usuarioForm.password}
                  onChange={(e) => setUsuarioForm({...usuarioForm, password: e.target.value})}
                  placeholder={editingUsuario ? '••••••••' : 'Contraseña'}
                  required={!editingUsuario}
                />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid grid-cols-2 gap-2 border p-2 rounded max-h-40 overflow-y-auto">
                  {roles.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`rol-${r.id}`}
                        checked={usuarioForm.rolIds.includes(r.id)}
                        onChange={() => toggleUsuarioRol(r.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`rol-${r.id}`} className="font-normal">{r.nombre}</Label>
                    </div>
                  ))}
                </div>
              </div>
              {editingUsuario && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={usuarioForm.activo}
                    onChange={(e) => setUsuarioForm({...usuarioForm, activo: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="activo">Usuario activo</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUsuarioDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingUsuario ? 'Actualizar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MÓDULO DIALOG */}
      <Dialog open={isModuloDialogOpen} onOpenChange={setIsModuloDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Módulo</Label>
              <Input 
                value={moduloForm.nombre}
                onChange={(e) => setModuloForm({...moduloForm, nombre: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                placeholder="nombre_modulo"
                required
                disabled={!!editingModulo}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input 
                value={moduloForm.descripcion}
                onChange={(e) => setModuloForm({...moduloForm, descripcion: e.target.value})}
                placeholder="Descripción del módulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input 
                type="number"
                value={moduloForm.orden}
                onChange={(e) => setModuloForm({...moduloForm, orden: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModuloDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveModulo}>{editingModulo ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROL DIALOG */}
      <Dialog open={isRolDialogOpen} onOpenChange={setIsRolDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRol ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRolSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Rol</Label>
                  <Input 
                    value={rolForm.nombre}
                    onChange={(e) => setRolForm({...rolForm, nombre: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    placeholder="nombre_rol"
                    required
                    disabled={!!editingRol}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input 
                    value={rolForm.descripcion}
                    onChange={(e) => setRolForm({...rolForm, descripcion: e.target.value})}
                    placeholder="Descripción del rol"
                  />
                </div>
              </div>
              
              {permisos && (
                <div className="space-y-2">
                  <Label>Módulos del Rol</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-2 rounded">
                    {permisos.modulos.map((modulo) => {
                      const isSelected = rolForm.moduloIds.includes(modulo.id)
                      return (
                        <div 
                          key={modulo.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'}`}
                          onClick={() => {
                            setRolForm(prev => ({
                              ...prev,
                              moduloIds: prev.moduloIds.includes(modulo.id)
                                ? prev.moduloIds.filter(id => id !== modulo.id)
                                : [...prev.moduloIds, modulo.id]
                            }))
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              setRolForm(prev => ({
                                ...prev,
                                moduloIds: prev.moduloIds.includes(modulo.id)
                                  ? prev.moduloIds.filter(id => id !== modulo.id)
                                  : [...prev.moduloIds, modulo.id]
                              }))
                            }}
                            className="sr-only"
                          />
                          <span className="text-sm">{modulo.nombre}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRolDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingRol ? 'Actualizar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RESTORE BACKUP DIALOG */}
      <Dialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Confirmar Restauración
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium">⚠️ Advertencia</p>
              <p className="text-yellow-700 text-sm mt-1">
                Esta acción reemplazará la base de datos actual con el backup seleccionado.
                Todos los datos actuales se perderán.
              </p>
            </div>
            {backupToRestore && (
              <div className="space-y-2">
                <p><span className="font-medium">Backup:</span> {backupToRestore.name}</p>
                <p><span className="font-medium">Fecha:</span> {new Date(backupToRestore.createdAt).toLocaleString('es-ES')}</p>
                <p><span className="font-medium">Tamaño:</span> {backupToRestore.sizeFormatted}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupToRestore(null)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleRestoreBackup}
              disabled={restoringBackup}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {restoringBackup ? 'Restaurando...' : 'Restaurar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
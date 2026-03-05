import { useState, useEffect } from 'react'
import { getCambios, getCambiosEstadisticas, createCambio, updateCambio, aprobarCambio, rechazarCambio, iniciarCambio, completarCambio, cancelarCambio, deleteCambio } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Wrench, Plus, Search, CheckCircle, XCircle, Clock, Play, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Cambio {
  id: number
  titulo: string
  descripcion: string
  tipo: string
  prioridad: string
  estado: string
  solicitante: string
  aprobador: string
  fechaAprobacion: string
  comentariosAprobacion: string
  fechaInicio: string
  fechaFin: string
  responsableEjecucion: string
  planRollback: string
  serviciosAfectados: string
  downtimeEstimado: string
  downtimeReal: string
  notas: string
  createdAt: string
}

export default function Cambios() {
  const [cambios, setCambios] = useState<Cambio[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Cambio | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'normal',
    prioridad: 'media',
    solicitante: '',
    planRollback: '',
    serviciosAfectados: '',
    downtimeEstimado: '',
    notas: ''
  })

  useEffect(() => {
    loadData()
  }, [filtroEstado, filtroTipo])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dataRes, statsRes] = await Promise.all([
        getCambios({ estado: filtroEstado || undefined, tipo: filtroTipo || undefined, buscar: search || undefined }),
        getCambiosEstadisticas()
      ])
      const cambiosData = Array.isArray(dataRes) ? dataRes : dataRes.data || []
      const statsData = statsRes?.data || statsRes || null
      setCambios(cambiosData)
      setEstadisticas(statsData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editando) {
        await updateCambio(editando.id, formData)
        toast({ title: 'Cambio actualizado' })
      } else {
        await createCambio(formData)
        toast({ title: 'Cambio creado' })
      }
      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleAccion = async (id: number, accion: string, data?: any) => {
    try {
      switch (accion) {
        case 'aprobar': await aprobarCambio(id, data?.comentarios); break
        case 'rechazar': await rechazarCambio(id, data?.comentarios); break
        case 'iniciar': await iniciarCambio(id, data?.responsable); break
        case 'completar': await completarCambio(id, data?.downtimeReal, data?.notas); break
        case 'cancelar': await cancelarCambio(id, data?.motivo); break
      }
      toast({ title: `Cambio ${accion}` })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar cambio?')) return
    try {
      await deleteCambio(id)
      toast({ title: 'Cambio eliminado' })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const openEdit = (cambio: Cambio) => {
    setEditando(cambio)
    setFormData({
      titulo: cambio.titulo,
      descripcion: cambio.descripcion,
      tipo: cambio.tipo,
      prioridad: cambio.prioridad,
      solicitante: cambio.solicitante || '',
      planRollback: cambio.planRollback || '',
      serviciosAfectados: cambio.serviciosAfectados || '',
      downtimeEstimado: cambio.downtimeEstimado || '',
      notas: cambio.notas || ''
    })
    setDialogOpen(true)
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      aprobado: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      rechazado: { color: 'bg-red-100 text-red-800', icon: XCircle },
      en_progreso: { color: 'bg-purple-100 text-purple-800', icon: Play },
      completado: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelado: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    }
    const cfg = config[estado] || { color: 'bg-gray-100', icon: Clock }
    const Icon = cfg.icon
    return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cfg.color}`}><Icon className="w-3 h-3" />{estado.replace('_', ' ')}</span>
  }

  const getPrioridadBadge = (prioridad: string) => {
    const config: Record<string, string> = {
      baja: 'bg-gray-100 text-gray-800',
      media: 'bg-blue-100 text-blue-800',
      alta: 'bg-orange-100 text-orange-800',
      critica: 'bg-red-100 text-red-800'
    }
    return <span className={`px-2 py-1 rounded-full text-xs ${config[prioridad] || ''}`}>{prioridad}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Gestión de Cambios</h1>
            <p className="text-muted-foreground">Solicitudes y aprobación de cambios</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setFormData({ titulo: '', descripcion: '', tipo: 'normal', prioridad: 'media', solicitante: '', planRollback: '', serviciosAfectados: '', downtimeEstimado: '', notas: '' }); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cambio
        </Button>
      </div>

      {/* Stats */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{estadisticas.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</div><p className="text-sm text-muted-foreground">Pendientes</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{estadisticas.aprobados}</div><p className="text-sm text-muted-foreground">Aprobados</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{estadisticas.completados}</div><p className="text-sm text-muted-foreground">Completados</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{estadisticas.rechazados}</div><p className="text-sm text-muted-foreground">Rechazados</p></CardContent></Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cambios..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" onKeyDown={e => e.key === 'Enter' && loadData()} />
        </div>
        <select className="p-2 border rounded-md" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
          <option value="en_progreso">En Progreso</option>
          <option value="completado">Completado</option>
        </select>
        <select className="p-2 border rounded-md" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="emergencia">Emergencia</option>
          <option value="normal">Normal</option>
          <option value="preventivo">Preventivo</option>
        </select>
        <Button variant="outline" onClick={loadData}>Actualizar</Button>
      </div>

      {/* Lista de Cambios */}
      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
        ) : cambios.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No hay cambios</CardContent></Card>
        ) : cambios.map(cambio => (
          <Card key={cambio.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getPrioridadBadge(cambio.prioridad)}
                    {getEstadoBadge(cambio.estado)}
                    <Badge variant="outline">{cambio.tipo}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{cambio.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{cambio.descripcion}</p>
                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    <span>Solicitante: {cambio.solicitante || '-'}</span>
                    <span>Responsable: {cambio.responsableEjecucion || '-'}</span>
                    <span>Downtime: {cambio.downtimeEstimado || '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {cambio.estado === 'pendiente' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAccion(cambio.id, 'aprobar', { comentarios: 'Aprobado' })}>Aprobar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAccion(cambio.id, 'rechazar', { comentarios: 'Rechazado' })}>Rechazar</Button>
                    </>
                  )}
                  {cambio.estado === 'aprobado' && (
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleAccion(cambio.id, 'iniciar', { responsable: '' })}>Iniciar</Button>
                  )}
                  {cambio.estado === 'en_progreso' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAccion(cambio.id, 'completar', { downtimeReal: '', notas: '' })}>Completar</Button>
                  )}
                  {cambio.estado !== 'completado' && cambio.estado !== 'cancelado' && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(cambio)}><Edit className="w-4 h-4" /></Button>
                  )}
                  {cambio.estado === 'pendiente' && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(cambio.id)}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar' : 'Nuevo'} Cambio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Título del cambio" />
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <textarea className="w-full p-2 border rounded-md" rows={3} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Descripción del cambio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="w-full p-2 border rounded-md" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="normal">Normal</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="preventivo">Preventivo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <select className="w-full p-2 border rounded-md" value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plan de Rollback</Label>
              <textarea className="w-full p-2 border rounded-md" rows={2} value={formData.planRollback} onChange={e => setFormData({...formData, planRollback: e.target.value})} placeholder="Plan de rollback en caso de fallo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Servicios Afectados</Label>
                <Input value={formData.serviciosAfectados} onChange={e => setFormData({...formData, serviciosAfectados: e.target.value})} placeholder="Lista de servicios" />
              </div>
              <div className="space-y-2">
                <Label>Downtime Estimado</Label>
                <Input value={formData.downtimeEstimado} onChange={e => setFormData({...formData, downtimeEstimado: e.target.value})} placeholder="ej: 30 minutos" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editando ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

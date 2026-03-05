import { useState, useEffect } from 'react'
import { getBackupsProgramados, getBackupsEstadisticas, createBackupProgramado, updateBackupProgramado, deleteBackupProgramado, ejecutarBackup, getHistorialBackup } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Play, Trash2, Edit, Loader } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Backup {
  id: number
  nombre: string
  tipo: string
  frecuencia: string
  diaSemana: number | null
  diaMes: number | null
  hora: number
  minuto: number
  retenerDias: number
  notificaciones: boolean
  emailNotificacion: string
  activo: boolean
  ultimoBackup: string
  proximoBackup: string
  ultimoEstado: string
  ultimoMensaje: string
}

export default function Backups() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [editando, setEditando] = useState<Backup | null>(null)
  const [backupSeleccionado, setBackupSeleccionado] = useState<Backup | null>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [ejecutando, setEjecutando] = useState<number | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'completo',
    frecuencia: 'daily',
    diaSemana: '',
    diaMes: '',
    hora: '2',
    minuto: '0',
    retenerDias: '30',
    notificaciones: true,
    emailNotificacion: '',
    activo: true
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dataRes, statsRes] = await Promise.all([getBackupsProgramados(), getBackupsEstadisticas()])
      const backupsData = Array.isArray(dataRes) ? dataRes : dataRes.data || []
      const statsData = statsRes?.data || statsRes || null
      setBackups(backupsData)
      setEstadisticas(statsData)
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        diaSemana: formData.diaSemana ? parseInt(formData.diaSemana) : null,
        diaMes: formData.diaMes ? parseInt(formData.diaMes) : null,
        hora: parseInt(formData.hora),
        minuto: parseInt(formData.minuto),
        retenerDias: parseInt(formData.retenerDias)
      }
      if (editando) { await updateBackupProgramado(editando.id, data); toast({ title: 'Backup actualizado' }) }
      else { await createBackupProgramado(data); toast({ title: 'Backup programado creado' }) }
      setDialogOpen(false)
      loadData()
    } catch (error: any) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar backup programado?')) return
    try { await deleteBackupProgramado(id); toast({ title: 'Backup eliminado' }); loadData() }
    catch (error: any) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
  }

  const handleEjecutar = async (id: number) => {
    setEjecutando(id)
    try {
      const result = await ejecutarBackup(id)
      toast({ title: result.data.estado === 'success' ? 'Backup completado' : 'Backup fallido', description: result.data.mensaje })
      loadData()
    } catch (error: any) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
    finally { setEjecutando(null) }
  }

  const verHistorial = async (backup: Backup) => {
    setBackupSeleccionado(backup)
    try {
      const data = await getHistorialBackup(backup.id)
      const historialData = Array.isArray(data) ? data : data.data || []
      setHistorial(historialData)
      setHistorialOpen(true)
    } catch (error: any) { toast({ variant: 'destructive', title: 'Error', description: error.message }) }
  }

  const openEdit = (backup: Backup) => {
    setEditando(backup)
    setFormData({
      nombre: backup.nombre, tipo: backup.tipo, frecuencia: backup.frecuencia,
      diaSemana: backup.diaSemana?.toString() || '', diaMes: backup.diaMes?.toString() || '',
      hora: backup.hora.toString(), minuto: backup.minuto.toString(),
      retenerDias: backup.retenerDias.toString(), notificaciones: backup.notificaciones,
      emailNotificacion: backup.emailNotificacion || '', activo: backup.activo
    })
    setDialogOpen(true)
  }

  const formatFrecuencia = (freq: string, diaSemana?: number | null, diaMes?: number | null) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    switch (freq) {
      case 'daily': return 'Diario'
      case 'weekly': return `Semanal (${dias[diaSemana || 0]})`
      case 'monthly': return `Mensual (Día ${diaMes})`
      default: return freq
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Backups Programados</h1>
            <p className="text-muted-foreground">Gestión de copias de seguridad</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setFormData({ nombre: '', tipo: 'completo', frecuencia: 'daily', diaSemana: '', diaMes: '', hora: '2', minuto: '0', retenerDias: '30', notificaciones: true, emailNotificacion: '', activo: true }); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Backup
        </Button>
      </div>

      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{estadisticas.total}</div><p className="text-sm text-muted-foreground">Total Programados</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{estadisticas.activos}</div><p className="text-sm text-muted-foreground">Activos</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{estadisticas.exitosos}</div><p className="text-sm text-muted-foreground">Exitosos (total)</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{estadisticas.fallidos}</div><p className="text-sm text-muted-foreground">Fallidos (total)</p></CardContent></Card>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
        ) : backups.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No hay backups programados</CardContent></Card>
        ) : backups.map(backup => (
          <Card key={backup.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${backup.activo ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Clock className={`w-6 h-6 ${backup.activo ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{backup.nombre}</h3>
                      <Badge variant={backup.activo ? 'default' : 'secondary'}>{backup.activo ? 'Activo' : 'Inactivo'}</Badge>
                      <Badge variant="outline">{backup.tipo}</Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Frecuencia: {formatFrecuencia(backup.frecuencia, backup.diaSemana, backup.diaMes)}</span>
                      <span>Hora: {backup.hora.toString().padStart(2, '0')}:{backup.minuto.toString().padStart(2, '0')}</span>
                      <span>Retención: {backup.retenerDias} días</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => verHistorial(backup)} variant="outline">Historial</Button>
                  <Button size="sm" onClick={() => handleEjecutar(backup.id)} disabled={ejecutando === backup.id}>
                    {ejecutando === backup.id ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(backup)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(backup.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? 'Editar' : 'Nuevo'} Backup Programado</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Nombre del backup" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="w-full p-2 border rounded-md" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="completo">Completo</option>
                  <option value="incremental">Incremental</option>
                  <option value="diferencial">Diferencial</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <select className="w-full p-2 border rounded-md" value={formData.frecuencia} onChange={e => setFormData({...formData, frecuencia: e.target.value})}>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
            {formData.frecuencia === 'weekly' && (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <select className="w-full p-2 border rounded-md" value={formData.diaSemana} onChange={e => setFormData({...formData, diaSemana: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  <option value="0">Domingo</option>
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
            )}
            {formData.frecuencia === 'monthly' && <div className="space-y-2"><Label>Día del mes</Label><Input type="number" min="1" max="28" value={formData.diaMes} onChange={e => setFormData({...formData, diaMes: e.target.value})} /></div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hora</Label><Input type="number" min="0" max="23" value={formData.hora} onChange={e => setFormData({...formData, hora: e.target.value})} /></div>
              <div className="space-y-2"><Label>Minuto</Label><Input type="number" min="0" max="59" value={formData.minuto} onChange={e => setFormData({...formData, minuto: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Retención (días)</Label><Input type="number" min="1" value={formData.retenerDias} onChange={e => setFormData({...formData, retenerDias: e.target.value})} /></div>
            <div className="space-y-2"><Label>Email de notificación</Label><Input type="email" value={formData.emailNotificacion} onChange={e => setFormData({...formData, emailNotificacion: e.target.value})} placeholder="admin@empresa.com" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="activo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} /><Label htmlFor="activo">Activo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editando ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historial de {backupSeleccionado?.nombre}</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Fecha</th><th className="text-left p-3 font-medium">Estado</th><th className="text-left p-3 font-medium">Mensaje</th><th className="text-left p-3 font-medium">Tamaño</th></tr></thead>
              <tbody>
                {historial.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Sin historial</td></tr> : historial.map(h => (
                  <tr key={h.id} className="border-t">
                    <td className="p-3">{new Date(h.inicio).toLocaleString('es-ES')}</td>
                    <td className="p-3"><Badge variant={h.estado === 'success' ? 'default' : 'destructive'}>{h.estado}</Badge></td>
                    <td className="p-3 text-sm">{h.mensaje}</td>
                    <td className="p-3">{h.tamanoBytes ? (h.tamanoBytes / 1024 / 1024).toFixed(2) + ' MB' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

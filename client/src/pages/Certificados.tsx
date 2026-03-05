import { useState, useEffect } from 'react'
import { getCertificados, getCertificadosEstadisticas, createCertificado, updateCertificado, deleteCertificado, getServidores } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Plus, Search, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Certificado {
  id: number
  dominio: string
  tipo: string
  emisor: string
  fechaEmision: string
  fechaVencimiento: string
  proveedorId: number | null
  proveedor?: { id: number; nombre: string }
  servidorId: number | null
  servidor?: { id: number; host: string; ip: string }
  notas: string
  activo: boolean
}

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([])
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [servidores, setServidores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Certificado | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | 'porVencer'>('todos')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    dominio: '',
    tipo: 'single',
    emisor: '',
    fechaEmision: '',
    fechaVencimiento: '',
    proveedorId: '',
    servidorId: '',
    notas: ''
  })

  useEffect(() => {
    loadData()
  }, [filtro])

  const loadData = async () => {
    setLoading(true)
    try {
      const [certsRes, statsRes, serversRes] = await Promise.all([
        getCertificados(filtro === 'vencidos', filtro === 'porVencer'),
        getCertificadosEstadisticas(),
        getServidores()
      ])
      const certsData = Array.isArray(certsRes) ? certsRes : certsRes.data || []
      const statsData = statsRes?.data || statsRes || null
      setCertificados(certsData)
      setEstadisticas(statsData)
      setServidores(serversRes)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        proveedorId: formData.proveedorId ? parseInt(formData.proveedorId) : null,
        servidorId: formData.servidorId ? parseInt(formData.servidorId) : null
      }
      
      if (editando) {
        await updateCertificado(editando.id, data)
        toast({ title: 'Certificado actualizado' })
      } else {
        await createCertificado(data)
        toast({ title: 'Certificado creado' })
      }
      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar certificado?')) return
    try {
      await deleteCertificado(id)
      toast({ title: 'Certificado eliminado' })
      loadData()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const openEdit = (cert: Certificado) => {
    setEditando(cert)
    setFormData({
      dominio: cert.dominio,
      tipo: cert.tipo,
      emisor: cert.emisor || '',
      fechaEmision: cert.fechaEmision?.split('T')[0] || '',
      fechaVencimiento: cert.fechaVencimiento?.split('T')[0] || '',
      proveedorId: cert.proveedorId?.toString() || '',
      servidorId: cert.servidorId?.toString() || '',
      notas: cert.notas || ''
    })
    setDialogOpen(true)
  }

  const filteredCerts = certificados.filter(c => 
    c.dominio.toLowerCase().includes(search.toLowerCase()) ||
    c.emisor?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (fechaVencimiento: string) => {
    const hoy = new Date()
    const vence = new Date(fechaVencimiento)
    const dias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    if (dias < 0) return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Vencido</Badge>
    if (dias <= 30) return <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> {dias} días</Badge>
    return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" /> {dias} días</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Certificados SSL</h1>
            <p className="text-muted-foreground">Gestión de certificados SSL/TLS</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setFormData({ dominio: '', tipo: 'single', emisor: '', fechaEmision: '', fechaVencimiento: '', proveedorId: '', servidorId: '', notas: '' }); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Certificado
        </Button>
      </div>

      {/* Stats */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{estadisticas.total}</div>
              <p className="text-sm text-muted-foreground">Total Certificados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{estadisticas.porVencer}</div>
              <p className="text-sm text-muted-foreground">Por Vencer (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{estadisticas?.activos || estadisticas.total - estadisticas.vencidos}</div>
              <p className="text-sm text-muted-foreground">Válidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar certificados..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('todos')}>Todos</Button>
          <Button variant={filtro === 'vencidos' ? 'destructive' : 'outline'} size="sm" onClick={() => setFiltro('vencidos')}>Vencidos</Button>
          <Button variant={filtro === 'porVencer' ? 'warning' : 'outline'} size="sm" onClick={() => setFiltro('porVencer')}>Por Vencer</Button>
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Dominio</th>
                  <th className="text-left p-4 font-medium">Tipo</th>
                  <th className="text-left p-4 font-medium">Emisor</th>
                  <th className="text-left p-4 font-medium">Vencimiento</th>
                  <th className="text-left p-4 font-medium">Servidor</th>
                  <th className="text-right p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
                ) : filteredCerts.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No hay certificados</td></tr>
                ) : filteredCerts.map(cert => (
                  <tr key={cert.id} className="border-t hover:bg-muted/30">
                    <td className="p-4 font-medium">{cert.dominio}</td>
                    <td className="p-4"><Badge variant="outline">{cert.tipo}</Badge></td>
                    <td className="p-4 text-muted-foreground">{cert.emisor || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cert.fechaVencimiento)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(cert.fechaVencimiento).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{cert.servidor?.host || cert.servidor?.ip || '-'}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cert)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cert.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar' : 'Nuevo'} Certificado SSL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dominio *</Label>
              <Input value={formData.dominio} onChange={e => setFormData({...formData, dominio: e.target.value})} placeholder="ejemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="w-full p-2 border rounded-md" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="single">Single Domain</option>
                  <option value="wildcard">Wildcard</option>
                  <option value="multi">Multi Domain</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Emisor</Label>
                <Input value={formData.emisor} onChange={e => setFormData({...formData, emisor: e.target.value})} placeholder="Let's Encrypt" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Emisión</Label>
                <Input type="date" value={formData.fechaEmision} onChange={e => setFormData({...formData, fechaEmision: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Vencimiento *</Label>
                <Input type="date" value={formData.fechaVencimiento} onChange={e => setFormData({...formData, fechaVencimiento: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <textarea className="w-full p-2 border rounded-md" rows={3} value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Servidor</Label>
              <select className="w-full p-2 border rounded-md" value={formData.servidorId} onChange={e => setFormData({...formData, servidorId: e.target.value})}>
                <option value="">Seleccionar servidor (opcional)</option>
                {servidores.map(s => (
                  <option key={s.id} value={s.id}>{s.host} ({s.ip})</option>
                ))}
              </select>
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

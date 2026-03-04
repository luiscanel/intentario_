import { useState, useEffect } from 'react'
import { getLicencias, createLicencia, updateLicencia, deleteLicencia } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'

interface Licencia {
  id: number
  nombre: string
  tipo: string
  version?: string
  cantidad: number
  usada: number
  costo?: number
  moneda: string
  fechaVencimiento?: string
  proveedor?: { id: number; nombre: string }
  activa: boolean
}

export default function Licencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Licencia | null>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Otro',
    version: '',
    cantidad: '1',
    usada: '0',
    costo: '',
    moneda: 'USD',
    fechaVencimiento: '',
    proveedorId: '',
    activa: true
  })

  useEffect(() => {
    cargarLicencias()
  }, [])

  const cargarLicencias = async () => {
    try {
      const data = await getLicencias()
      setLicencias(data)
    } catch (error) {
      console.error('Error:', error)
      setLicencias([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const data: any = { 
        ...form, 
        cantidad: Number(form.cantidad), 
        usada: Number(form.usada),
        proveedorId: form.proveedorId ? parseInt(form.proveedorId as any) : null
      }
      if (data.costo) data.costo = parseFloat(data.costo)
      
      if (editando) {
        await updateLicencia(editando.id, data)
        toast({ title: 'Licencia actualizada' })
      } else {
        await createLicencia(data)
        toast({ title: 'Licencia creada' })
      }
      setShowModal(false)
      cargarLicencias()
      resetForm()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar licencia?')) return
    try {
      await deleteLicencia(id)
      toast({ title: 'Licencia eliminada' })
      cargarLicencias()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setForm({ nombre: '', tipo: 'Otro', version: '', cantidad: '1', usada: '0', costo: '', moneda: 'USD', fechaVencimiento: '', proveedorId: '', activa: true })
    setEditando(null)
  }

  const abrirEditar = (l: Licencia) => {
    setEditando(l)
    setForm({
      nombre: l.nombre,
      tipo: l.tipo,
      version: l.version || '',
      cantidad: l.cantidad.toString(),
      usada: l.usada.toString(),
      costo: l.costo?.toString() || '',
      moneda: l.moneda,
      fechaVencimiento: l.fechaVencimiento ? l.fechaVencimiento.split('T')[0] : '',
      proveedorId: l.proveedor?.id?.toString() || '',
      activa: l.activa
    })
    setShowModal(true)
  }

  const estaPorVencer = (fecha?: string) => {
    if (!fecha) return false
    const vto = new Date(fecha)
    const ahora = new Date()
    const dias = Math.ceil((vto.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    return dias <= 30 && dias > 0
  }

  const estaVencida = (fecha?: string) => {
    if (!fecha) return false
    return new Date(fecha) < new Date()
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Licencias de Software</h1>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>Nueva Licencia</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Cantidad</th>
              <th className="px-4 py-2 text-left">Usadas</th>
              <th className="px-4 py-2 text-left">Costo</th>
              <th className="px-4 py-2 text-left">Vencimiento</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {licencias.map(l => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 font-medium">{l.nombre}</td>
                <td className="px-4 py-2">{l.tipo}</td>
                <td className="px-4 py-2">{l.cantidad}</td>
                <td className="px-4 py-2">{l.usada}/{l.cantidad}</td>
                <td className="px-4 py-2">{l.costo ? `$${l.costo} ${l.moneda}` : '-'}</td>
                <td className="px-4 py-2">
                  {l.fechaVencimiento ? (
                    <span className={estaVencida(l.fechaVencimiento) ? 'text-red-600' : estaPorVencer(l.fechaVencimiento) ? 'text-yellow-600' : ''}>
                      {new Date(l.fechaVencimiento).toLocaleDateString()}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={l.activa ? 'default' : 'secondary'}>{l.activa ? 'Activa' : 'Inactiva'}</Badge>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(l)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(l.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {licencias.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hay licencias registradas</div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Licencia' : 'Nueva Licencia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            <select className="w-full p-2 border rounded" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option value="Windows">Windows</option>
              <option value="Office">Office</option>
              <option value="Antivirus">Antivirus</option>
              <option value="SQL">SQL Server</option>
              <option value="Otro">Otro</option>
            </select>
            <Input placeholder="Versión" value={form.version} onChange={e => setForm({...form, version: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Cantidad" type="number" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} />
              <Input placeholder="Usadas" type="number" value={form.usada} onChange={e => setForm({...form, usada: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Costo" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} />
              <select className="w-full p-2 border rounded" value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="COP">COP</option>
              </select>
            </div>
            <Input placeholder="Fecha de vencimiento" type="date" value={form.fechaVencimiento} onChange={e => setForm({...form, fechaVencimiento: e.target.value})} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editando ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

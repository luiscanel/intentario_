import { useState, useEffect } from 'react'
import { getContratos, createContrato, updateContrato, deleteContrato } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'

interface Contrato {
  id: number
  proveedorId?: number
  proveedor?: { id: number; nombre: string }
  tipo: string
  numero?: string
  objeto?: string
  monto?: number
  moneda: string
  fechaInicio: string
  fechaFin: string
  estado: string
  observaciones?: string
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({
    proveedorId: '',
    tipo: 'Mantenimiento',
    numero: '',
    objeto: '',
    monto: '',
    moneda: 'USD',
    fechaInicio: '',
    fechaFin: '',
    estado: 'Activo',
    observaciones: ''
  })

  useEffect(() => {
    cargarContratos()
  }, [])

  const cargarContratos = async () => {
    try {
      const data = await getContratos()
      setContratos(data)
    } catch (error) {
      console.error('Error:', error)
      setContratos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const data: any = { ...form }
      if (form.proveedorId) data.proveedorId = parseInt(form.proveedorId)
      if (form.monto) data.monto = parseFloat(form.monto)
      
      if (editando) {
        await updateContrato(editando.id, data)
        toast({ title: 'Contrato actualizado' })
      } else {
        await createContrato(data)
        toast({ title: 'Contrato creado' })
      }
      setShowModal(false)
      cargarContratos()
      resetForm()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar contrato?')) return
    try {
      await deleteContrato(id)
      toast({ title: 'Contrato eliminado' })
      cargarContratos()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setForm({ proveedorId: '', tipo: 'Mantenimiento', numero: '', objeto: '', monto: '', moneda: 'USD', fechaInicio: '', fechaFin: '', estado: 'Activo', observaciones: '' })
    setEditando(null)
  }

  const abrirEditar = (c: Contrato) => {
    setEditando(c)
    setForm({
      proveedorId: c.proveedorId?.toString() || '',
      tipo: c.tipo,
      numero: c.numero || '',
      objeto: c.objeto || '',
      monto: c.monto?.toString() || '',
      moneda: c.moneda,
      fechaInicio: c.fechaInicio ? c.fechaInicio.split('T')[0] : '',
      fechaFin: c.fechaFin ? c.fechaFin.split('T')[0] : '',
      estado: c.estado,
      observaciones: c.observaciones || ''
    })
    setShowModal(true)
  }

  const estaPorVencer = (fecha: string) => {
    const vto = new Date(fecha)
    const ahora = new Date()
    const dias = Math.ceil((vto.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    return dias <= 30 && dias > 0
  }

  const estaVencido = (fecha: string) => {
    return new Date(fecha) < new Date()
  }

  const getEstadoBadge = (c: Contrato) => {
    if (c.estado === 'Vencido' || estaVencido(c.fechaFin)) return <Badge variant="destructive">Vencido</Badge>
    if (estaPorVencer(c.fechaFin)) return <Badge variant="warning">Por vencer</Badge>
    return <Badge>{c.estado}</Badge>
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contratos y Garantías</h1>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>Nuevo Contrato</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Número</th>
              <th className="px-4 py-2 text-left">Proveedor</th>
              <th className="px-4 py-2 text-left">Monto</th>
              <th className="px-4 py-2 text-left">Inicio</th>
              <th className="px-4 py-2 text-left">Fin</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 font-medium">{c.tipo}</td>
                <td className="px-4 py-2">{c.numero || '-'}</td>
                <td className="px-4 py-2">{c.proveedor?.nombre || '-'}</td>
                <td className="px-4 py-2">{c.monto ? `$${c.monto} ${c.moneda}` : '-'}</td>
                <td className="px-4 py-2">{c.fechaInicio ? new Date(c.fechaInicio).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2">{c.fechaFin ? new Date(c.fechaFin).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2">{getEstadoBadge(c)}</td>
                <td className="px-4 py-2 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => abrirEditar(c)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contratos.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hay contratos registrados</div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Contrato' : 'Nuevo Contrato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select className="w-full p-2 border rounded" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Soporte">Soporte</option>
              <option value="Hosting">Hosting</option>
              <option value="Garantía">Garantía</option>
              <option value="Otro">Otro</option>
            </select>
            <Input placeholder="Número de contrato" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} />
            <Input placeholder="Objeto del contrato" value={form.objeto} onChange={e => setForm({...form, objeto: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Monto" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} />
              <select className="w-full p-2 border rounded" value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="COP">COP</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Fecha inicio" type="date" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} />
              <Input placeholder="Fecha fin" type="date" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} />
            </div>
            <select className="w-full p-2 border rounded" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
              <option value="Activo">Activo</option>
              <option value="Vencido">Vencido</option>
              <option value="Renovado">Renovado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <Input placeholder="Observaciones" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
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

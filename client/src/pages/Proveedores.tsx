import { useState, useEffect } from 'react'
import { getProveedores, createProveedor, updateProveedor, deleteProveedor } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'

interface Proveedor {
  id: number
  nombre: string
  contacto?: string
  email?: string
  telefono?: string
  direccion?: string
  servicios?: string
  notas?: string
  activo: boolean
  createdAt: string
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({
    nombre: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    servicios: '',
    notas: '',
    activo: true
  })

  useEffect(() => {
    cargarProveedores()
  }, [])

  const cargarProveedores = async () => {
    try {
      const data = await getProveedores()
      setProveedores(data)
    } catch (error) {
      console.error('Error:', error)
      setProveedores([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editando) {
        await updateProveedor(editando.id, form)
        toast({ title: 'Proveedor actualizado' })
      } else {
        await createProveedor(form)
        toast({ title: 'Proveedor creado' })
      }
      setShowModal(false)
      cargarProveedores()
      resetForm()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar proveedor?')) return
    try {
      await deleteProveedor(id)
      toast({ title: 'Proveedor eliminado' })
      cargarProveedores()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const resetForm = () => {
    setForm({ nombre: '', contacto: '', email: '', telefono: '', direccion: '', servicios: '', notas: '', activo: true })
    setEditando(null)
  }

  const abrirEditar = (p: Proveedor) => {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      contacto: p.contacto || '',
      email: p.email || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      servicios: p.servicios || '',
      notas: p.notas || '',
      activo: p.activo
    })
    setShowModal(true)
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>Nuevo Proveedor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proveedores.map(p => (
          <Card key={p.id} className={!p.activo ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{p.nombre}</CardTitle>
                <Badge variant={p.activo ? 'default' : 'secondary'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.contacto && <p><span className="font-medium">Contacto:</span> {p.contacto}</p>}
              {p.email && <p><span className="font-medium">Email:</span> {p.email}</p>}
              {p.telefono && <p><span className="font-medium">Teléfono:</span> {p.telefono}</p>}
              {p.servicios && <p><span className="font-medium">Servicios:</span> {p.servicios}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => abrirEditar(p)}>Editar</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {proveedores.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hay proveedores registrados</div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            <Input placeholder="Contacto" value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})} />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <Input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
            <Input placeholder="Dirección" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
            <Input placeholder="Servicios (separados por coma)" value={form.servicios} onChange={e => setForm({...form, servicios: e.target.value})} />
            <Input placeholder="Notas" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} />
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

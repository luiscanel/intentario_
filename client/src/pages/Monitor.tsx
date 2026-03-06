import { useState, useEffect } from 'react'
import { getMonitor, addMonitor, deleteMonitor, pingAll } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'

interface Disponibilidad {
  id: number
  servidorId?: number
  ip: string
  nombre?: string
  status: string
  latency?: number
  ultimoCheck: string
}

export default function Monitor() {
  const [monitoreo, setMonitoreo] = useState<Disponibilidad[]>([])
  const [loading, setLoading] = useState(true)
  const [pingLoading, setPingLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', nombre: '' })
  const [autoPing, setAutoPing] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    cargarMonitoreo()
  }, [])

  // Auto-ping cada 10 segundos
  useEffect(() => {
    if (!autoPing || monitoreo.length === 0) return
    
    const interval = setInterval(() => {
      console.log('Auto-ping ejecutándose...')
      ejecutarPingAllSilencioso()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [autoPing, monitoreo.length])

  const ejecutarPingAllSilencioso = async () => {
    try {
      console.log('Auto-ping ejecutándose...')
      await pingAll()
      console.log('Auto-ping completado, recargando datos...')
      await cargarMonitoreo()
      console.log('Auto-ping datos actualizados')
    } catch (error) {
      console.error('Auto-ping error:', error)
    }
  }

  const cargarMonitoreo = async () => {
    console.log('Cargando monitoreo...')
    try {
      const data = await getMonitor()
      console.log('Datos recibidos:', data)
      setMonitoreo(data)
      console.log('Estado actualizado')
    } catch (error) {
      console.error('Error:', error)
      setMonitoreo([])
    } finally {
      setLoading(false)
    }
  }

  const agregarMonitor = async () => {
    if (!form.ip) return
    try {
      await addMonitor({ ip: form.ip, nombre: form.nombre || form.ip })
      toast({ title: 'Monitor agregado' })
      setShowModal(false)
      setForm({ ip: '', nombre: '' })
      cargarMonitoreo()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const eliminarMonitor = async (id: number) => {
    if (!confirm('¿Eliminar del monitoreo?')) return
    try {
      await deleteMonitor(id)
      toast({ title: 'Eliminado' })
      cargarMonitoreo()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const ejecutarPingAll = async () => {
    console.log('Ejecutando ping...')
    setPingLoading(true)
    try {
      const res = await pingAll()
      console.log('Ping resultado:', res)
      const { online, offline } = res
      toast({ title: `Ping completado: ${online} online, ${offline} offline` })
      cargarMonitoreo()
    } catch (error: any) {
      console.error('Error ping:', error)
      toast({ title: 'Error al hacer ping', description: error.message, variant: 'destructive' })
    } finally {
      setPingLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-100 text-green-800">Online</Badge>
      case 'offline': return <Badge variant="destructive">Offline</Badge>
      default: return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const online = monitoreo?.filter(m => m.status === 'online').length || 0
  const offline = monitoreo?.filter(m => m.status === 'offline').length || 0

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Monitor de Disponibilidad</h1>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoPing} 
              onChange={(e) => setAutoPing(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-ping (10s)
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarMonitoreo}>Actualizar</Button>
          <Button variant="outline" onClick={ejecutarPingAll} disabled={pingLoading}>
            {pingLoading ? 'Ping...' : 'Ejecutar Ping'}
          </Button>
          <Button onClick={() => setShowModal(true)}>Agregar IP</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{monitoreo.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{online}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{offline}</div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Nombre/IP</th>
              <th className="px-4 py-2 text-left">IP</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Latencia</th>
              <th className="px-4 py-2 text-left">Último Check</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {monitoreo.map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2 font-medium">{m.nombre || '-'}</td>
                <td className="px-4 py-2">{m.ip}</td>
                <td className="px-4 py-2">{getStatusBadge(m.status)}</td>
                <td className="px-4 py-2">{m.latency ? `${m.latency}ms` : '-'}</td>
                <td className="px-4 py-2">{new Date(m.ultimoCheck).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <Button variant="destructive" size="sm" onClick={() => eliminarMonitor(m.id)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {monitoreo.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay IPs en monitoreo. Agrega una IP para comenzar.
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar al monitoreo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input 
              placeholder="IP o hostname *" 
              value={form.ip} 
              onChange={e => setForm({...form, ip: e.target.value})} 
            />
            <Input 
              placeholder="Nombre (opcional)" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={agregarMonitor}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

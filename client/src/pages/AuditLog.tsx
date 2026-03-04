import { useState, useEffect } from 'react'
import { getAuditLogs } from '../lib/api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'

interface AuditLog {
  id: number
  usuarioId?: number
  usuario?: string
  accion: string
  entidad: string
  entidadId?: number
  datosPrevios?: string
  datosNuevos?: string
  ip?: string
  userAgent?: string
  createdAt: string
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    cargarLogs()
  }, [])

  const cargarLogs = async () => {
    try {
      const data = await getAuditLogs()
      setLogs(data)
    } catch (error) {
      console.error('Error:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case 'create': return <Badge className="bg-green-100 text-green-800">Creado</Badge>
      case 'update': return <Badge className="bg-blue-100 text-blue-800">Actualizado</Badge>
      case 'delete': return <Badge variant="destructive">Eliminado</Badge>
      case 'login': return <Badge className="bg-purple-100 text-purple-800">Login</Badge>
      case 'import': return <Badge className="bg-yellow-100 text-yellow-800">Importado</Badge>
      case 'export': return <Badge className="bg-gray-100 text-gray-800">Exportado</Badge>
      default: return <Badge>{accion}</Badge>
    }
  }

  const filtrados = logs.filter(log => {
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return (
      log.usuario?.toLowerCase().includes(f) ||
      log.entidad.toLowerCase().includes(f) ||
      log.accion.toLowerCase().includes(f)
    )
  })

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Historial de Cambios (Audit Log)</h1>
        <Button variant="outline" onClick={cargarLogs}>Actualizar</Button>
      </div>

      <Input 
        placeholder="Buscar..." 
        value={filtro} 
        onChange={e => setFiltro(e.target.value)}
        className="max-w-md"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Usuario</th>
              <th className="px-4 py-2 text-left">Acción</th>
              <th className="px-4 py-2 text-left">Entidad</th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(log => (
              <tr key={log.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">{log.usuario || 'Sistema'}</td>
                <td className="px-4 py-2">{getAccionBadge(log.accion)}</td>
                <td className="px-4 py-2">{log.entidad}</td>
                <td className="px-4 py-2">{log.entidadId || '-'}</td>
                <td className="px-4 py-2 text-gray-500">{log.ip || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hay registros</div>
      )}
    </div>
  )
}

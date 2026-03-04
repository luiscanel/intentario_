import { useState, useEffect } from 'react'
import { getAlertas, marcarAlertaLeida, marcarTodasAlertasLeidas, deleteAlerta } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useToast } from '../components/ui/use-toast'

interface Alerta {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  entidad?: string
  entidadId?: number
  leida: boolean
  leidaPor?: string
  leidaAt?: string
  createdAt: string
}

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    cargarAlertas()
  }, [])

  const cargarAlertas = async () => {
    try {
      const data = await getAlertas()
      setAlertas(data)
    } catch (error) {
      console.error('Error:', error)
      setAlertas([])
    } finally {
      setLoading(false)
    }
  }

  const marcarLeida = async (id: number) => {
    try {
      await marcarAlertaLeida(id)
      cargarAlertas()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasAlertasLeidas()
      toast({ title: 'Todas las alertas marcadas como leídas' })
      cargarAlertas()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const eliminarAlerta = async (id: number) => {
    try {
      await deleteAlerta(id)
      cargarAlertas()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'error': return 'bg-orange-100 text-orange-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const noLeidas = alertas.filter(a => !a.leida).length

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Alertas</h1>
          {noLeidas > 0 && <Badge variant="destructive">{noLeidas} nuevas</Badge>}
        </div>
        {noLeidas > 0 && <Button variant="outline" onClick={marcarTodasLeidas}>Marcar todas como leídas</Button>}
      </div>

      <div className="space-y-3">
        {alertas.map(alerta => (
          <Card key={alerta.id} className={alerta.leida ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(alerta.tipo)}`}>
                    {alerta.tipo.toUpperCase()}
                  </span>
                  <CardTitle className="text-lg">{alerta.titulo}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {!alerta.leida && <Button size="sm" variant="outline" onClick={() => marcarLeida(alerta.id)}>Marcar leída</Button>}
                  <Button size="sm" variant="destructive" onClick={() => eliminarAlerta(alerta.id)}>Eliminar</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{alerta.mensaje}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                {alerta.entidad && <span>Entidad: {alerta.entidad}</span>}
                <span>{new Date(alerta.createdAt).toLocaleString()}</span>
                {alerta.leida && alerta.leidaAt && <span>Leída: {new Date(alerta.leidaAt).toLocaleString()}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alertas.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hay alertas</div>
      )}
    </div>
  )
}

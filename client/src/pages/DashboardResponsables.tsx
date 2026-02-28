import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardResponsables } from '@/lib/api'
import {
  User,
  Server,
  HardDrive,
  CheckCircle,
  Layers
} from 'lucide-react'
import { StatCard as ModernStatCard, DonutChartCard, BarChartCard } from '@/components/charts/ModernCharts'

const StatCard = ModernStatCard

interface ResponsableStats {
  totalVMs: number
  totalEquipos: number
  vmsConResponsable: number
  equiposConResponsable: number
  porcentajeVMsConResponsable: number
  porcentajeEquiposConResponsable: number
  responsablesCombinados: {
    responsable: string
    totalVMs: number
    vmsActivos: number
    vmsInactivos: number
    vmsMantenimiento: number
    totalEquipos: number
    paises: string[]
    categorias: string[]
  }[]
  listaResponsables: string[]
}

export default function DashboardResponsables() {
  const [stats, setStats] = useState<ResponsableStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedResponsable, setSelectedResponsable] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getDashboardResponsables()
      setStats(data)
    } catch (error) {
      console.error('Error loading responsables stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Prepare chart data
  const responsableData = stats?.responsablesCombinados?.slice(0, 12).map(r => ({
    name: r.responsable,
    VMs: r.totalVMs,
    Equipos: r.totalEquipos,
    total: r.totalVMs + r.totalEquipos
  })) || []

  const coverageData = [
    { name: 'VMs Asignadas', value: stats?.vmsConResponsable || 0 },
    { name: 'VMs Sin Asignar', value: (stats?.totalVMs || 0) - (stats?.vmsConResponsable || 0) }
  ]

  const selectedData = stats?.responsablesCombinados?.find(r => r.responsable === selectedResponsable)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Responsables
          </h1>
          <p className="text-gray-500 mt-1">Distribución por responsable de VMs y equipos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total VMs"
          value={stats?.totalVMs || 0}
          icon={Server}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Equipos"
          value={stats?.totalEquipos || 0}
          icon={HardDrive}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="VMs Asignadas"
          value={`${stats?.porcentajeVMsConResponsable || 0}%`}
          icon={CheckCircle}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle={`${stats?.vmsConResponsable || 0} de ${stats?.totalVMs || 0}`}
        />
        <StatCard
          title="Equipos Asignados"
          value={`${stats?.porcentajeEquiposConResponsable || 0}%`}
          icon={User}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={`${stats?.equiposConResponsable || 0} de ${stats?.totalEquipos || 0}`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutChartCard 
          data={coverageData} 
          colors={['#22c55e', '#ef4444']} 
          title="Asignación de VMs" 
          icon={CheckCircle}
          colorClass="bg-gradient-to-br from-green-500 to-emerald-500"
        />
        <BarChartCard 
          data={responsableData} 
          title="Distribución por Responsable" 
          icon={User}
          colorClass="bg-gradient-to-br from-violet-500 to-purple-500"
        />
      </div>

      {/* Detalle por Responsable */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Detalle por Responsable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Responsable</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Total VMs</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">VMs Activas</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">VMs Inactivas</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Equipos</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Países</th>
                </tr>
              </thead>
              <tbody>
                {stats?.responsablesCombinados?.slice(0, 15).map((resp, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedResponsable === resp.responsable ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedResponsable(
                      selectedResponsable === resp.responsable ? null : resp.responsable
                    )}
                  >
                    <td className="py-2 px-2 font-medium">{resp.responsable}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {resp.totalVMs}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-green-600 font-medium">{resp.vmsActivos}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-red-600 font-medium">{resp.vmsInactivos}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {resp.totalEquipos}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {resp.paises.slice(0, 3).map((pais, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {pais}
                          </span>
                        ))}
                        {resp.paises.length > 3 && (
                          <span className="text-xs text-gray-500">+{resp.paises.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Responsable Detail */}
      {selectedData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Detalle: {selectedData.responsable}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total VMs</p>
                <p className="text-xl font-bold text-blue-600">{selectedData.totalVMs}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-500">VMs Activas</p>
                <p className="text-xl font-bold text-green-600">{selectedData.vmsActivos}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-500">VMs Inactivas</p>
                <p className="text-xl font-bold text-red-600">{selectedData.vmsInactivos}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-500">Equipos Físicos</p>
                <p className="text-xl font-bold text-purple-600">{selectedData.totalEquipos}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Países:</p>
              <div className="flex flex-wrap gap-2">
                {selectedData.paises.map((pais, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {pais}
                  </span>
                ))}
              </div>
            </div>
            {selectedData.categorias.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Categorías:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedData.categorias.map((cat, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardPhysical } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import {
  HardDrive,
  Package,
  CheckCircle,
  Globe,
  Layers,
  Cpu,
  User,
  Calendar,
  Network
} from 'lucide-react'
import { StatCard as ModernStatCard, DonutChartCard, BarChartCard, ModernTooltip } from '@/components/charts/ModernCharts'

const StatCard = ModernStatCard
const CustomTooltip = ModernTooltip

interface PhysicalStats {
  totalEquipos: number
  porEstado: { estado: string; count: number }[]
  porCategoria: { categoria: string; count: number }[]
  porMarca: { marca: string; count: number }[]
  porPais: { pais: string; count: number }[]
  porResponsable: { responsable: string; count: number }[]
  porModelo: { modelo: string; count: number }[]
  garantiaProxima: {
    id: number
    equipo: string | null
    modelo: string | null
    serie: string | null
    garantia: string
    responsable: string | null
    pais: string
  }[]
  garantiaVencida: {
    id: number
    equipo: string | null
    modelo: string | null
    serie: string | null
    garantia: string
    responsable: string | null
    pais: string
  }[]
  conIp: number
  sinIp: number
  conIlo: number
  sinIlo: number
}

export default function DashboardInventarioFisico() {
  const [stats, setStats] = useState<PhysicalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'garantia' | 'ip'>('garantia')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getDashboardPhysical()
      setStats(data)
    } catch (error) {
      console.error('Error loading physical stats:', error)
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

  const estadoData = stats?.porEstado?.map(e => ({
    name: e.estado,
    value: e.count
  })) || []

  const ipData = [
    { name: 'Con IP', value: stats?.conIp || 0 },
    { name: 'Sin IP', value: stats?.sinIp || 0 }
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Inventario Físico
          </h1>
          <p className="text-gray-500 mt-1">Estado detallado de equipos físicos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Equipos"
          value={stats?.totalEquipos || 0}
          icon={HardDrive}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Categorías"
          value={stats?.porCategoria?.length || 0}
          icon={Package}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Marcas"
          value={stats?.porMarca?.length || 0}
          icon={Layers}
          color="bg-gradient-to-br from-pink-500 to-pink-600"
        />
        <StatCard
          title="Responsables"
          value={stats?.porResponsable?.length || 0}
          icon={User}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutChartCard 
          data={estadoData} 
          colors={['#22c55e', '#3b82f6', '#ef4444', '#6b7280']} 
          title="Estado de Equipos" 
          icon={CheckCircle}
          colorClass="bg-gradient-to-br from-green-500 to-emerald-500"
        />
        <BarChartCard 
          data={stats?.porCategoria?.map((c: any) => ({ name: c.categoria, count: c.count })) || []} 
          title="Por Categoría" 
          icon={Package}
          colorClass="bg-gradient-to-br from-violet-500 to-purple-500"
          layout="vertical"
        />

        {/* Por País */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-500" />
              Por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.porPais?.slice(0, 8) || []}>
                  <defs>
                    <linearGradient id="grad-fisico-pais" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="pais" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="url(#grad-fisico-pais)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Marca */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-500" />
              Por Marca (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.porMarca?.slice(0, 10) || []}>
                  <defs>
                    <linearGradient id="grad-fisico-marca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="marca" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" fill="url(#grad-fisico-marca)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* IP Address Coverage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-500" />
              Cobertura de IP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="grad-ip-1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="grad-ip-2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={ipData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="url(#grad-ip-1)" />
                    <Cell fill="url(#grad-ip-2)" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Garantías */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Gestión de Garantías
            </CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('garantia')}
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === 'garantia' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Próximas a vencer ({stats?.garantiaProxima?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('ip')}
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === 'ip' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Vencidas ({stats?.garantiaVencida?.length || 0})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Equipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Modelo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Serie</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Responsable</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">País</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'garantia' ? (stats?.garantiaProxima || []) : (stats?.garantiaVencida || [])).slice(0, 15).map((eq, idx) => (
                  <tr key={eq.id || idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium">{eq.equipo || '-'}</td>
                    <td className="py-2 px-2">{eq.modelo || '-'}</td>
                    <td className="py-2 px-2 font-mono text-xs">{eq.serie || '-'}</td>
                    <td className="py-2 px-2">{eq.responsable || '-'}</td>
                    <td className="py-2 px-2">{eq.pais}</td>
                    <td className="py-2 px-2">
                      {activeTab === 'garantia' ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          getDaysUntil(eq.garantia) <= 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {formatDate(eq.garantia)} ({getDaysUntil(eq.garantia)} días)
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                          {formatDate(eq.garantia)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(activeTab === 'garantia' ? (stats?.garantiaProxima || []) : (stats?.garantiaVencida || [])).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      {activeTab === 'garantia' ? 'No hay garantías próximas a vencer' : 'No hay garantías vencidas'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

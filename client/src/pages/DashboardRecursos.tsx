import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardResources } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Cpu,
  HardDrive,
  Server,
  Zap,
  Database,
  Globe,
  Layers
} from 'lucide-react'
import { StatCard as ModernStatCard, BarChartCard, ModernTooltip } from '@/components/charts/ModernCharts'

const StatCard = ModernStatCard
const CustomTooltip = ModernTooltip

interface ResourceStats {
  totalVMs: number
  conRecursos: number
  stats: {
    cpu: { avg: number; max: number; min: number }
    memoria: { avg: number; max: number }
    disco: { total: number; avg: number }
  }
  porCpuRango: { range: string; count: number }[]
  porMemoriaRango: { range: string; count: number }[]
  porAmbiente: { ambiente: string; cpu: number; memoria: number; disco: number; count: number }[]
  porPais: { pais: string; cpu: number; memoria: number; disco: number; count: number }[]
  topCpu: any[]
  topMemoria: any[]
  topDisco: any[]
}

export default function DashboardRecursos() {
  const [stats, setStats] = useState<ResourceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getDashboardResources()
      setStats(data)
    } catch (error) {
      console.error('Error loading resource stats:', error)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Recursos
          </h1>
          <p className="text-gray-500 mt-1">Distribución de recursos de VMs y servidores</p>
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
          title="Promedio CPU"
          value={`${stats?.stats?.cpu?.avg || 0} cores`}
          icon={Cpu}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`Max: ${stats?.stats?.cpu?.max || 0} cores`}
        />
        <StatCard
          title="Promedio Memoria"
          value={`${stats?.stats?.memoria?.avg || 0} GB`}
          icon={Zap}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={`Max: ${stats?.stats?.memoria?.max || 0} GB`}
        />
        <StatCard
          title="Total Disco"
          value={`${(stats?.stats?.disco?.total || 0).toLocaleString()} GB`}
          icon={Database}
          color="bg-gradient-to-br from-cyan-500 to-cyan-600"
          subtitle={`Promedio: ${stats?.stats?.disco?.avg || 0} GB`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard 
          data={stats?.porCpuRango?.map((r: any) => ({ name: r.range, count: r.count })) || []} 
          title="Distribución por CPU" 
          icon={Cpu}
          colorClass="bg-gradient-to-br from-violet-500 to-purple-500"
        />
        <BarChartCard 
          data={stats?.porMemoriaRango?.map((r: any) => ({ name: r.range, count: r.count })) || []} 
          title="Distribución por Memoria" 
          icon={Zap}
          colorClass="bg-gradient-to-br from-amber-500 to-orange-500"
        />
      </div>

      {/* Charts Row 2 - Por Ambiente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU por Ambiente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              CPU por Ambiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.porAmbiente || []}>
                  <defs>
                    <linearGradient id="grad-cpu-amb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="ambiente" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="cpu" fill="url(#grad-cpu-amb)" radius={[6, 6, 0, 0]} name="CPU Cores" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Memoria por Ambiente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-500" />
              Memoria por Ambiente (GB)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.porAmbiente || []}>
                  <defs>
                    <linearGradient id="grad-mem-amb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="ambiente" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="memoria" fill="url(#grad-mem-amb)" radius={[6, 6, 0, 0]} name="Memoria GB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Servers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top CPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-red-500" />
              Top 10 - CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats?.topCpu?.map((server, idx) => (
                <div key={server.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-700 rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {server.nombreVM || server.host}
                      </p>
                      <p className="text-xs text-gray-500">{server.pais} • {server.ambiente}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600">{server.cpu} CPU</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Memoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Top 10 - Memoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats?.topMemoria?.map((server, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {server.nombreVM || server.host}
                      </p>
                      <p className="text-xs text-gray-500">{server.pais}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{server.memoria} GB</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Disco */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-500" />
              Top 10 - Disco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats?.topDisco?.map((server, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {server.nombreVM || server.host}
                      </p>
                      <p className="text-xs text-gray-500">{server.pais}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-cyan-600">{server.disco} GB</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

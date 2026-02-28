import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardSecurity } from '@/lib/api'
import {
  Shield,
  ShieldOff,
  AlertTriangle,
  Server,
  Cpu,
  Globe,
  Monitor,
  CheckCircle
} from 'lucide-react'
import { StatCard, DonutChartCard, BarChartCard } from '@/components/charts/ModernCharts'

interface SecurityStats {
  totalVMs: number
  conAntivirus: number
  sinAntivirus: number
  porcentajeProtegido: number
  porAntivirus: { antivirus: string; count: number }[]
  vmsSinAntivirus: {
    id: number
    host: string
    nombreVM: string | null
    ip: string | null
    pais: string
    ambiente: string
    estado: string
  }[]
  porArquitectura: { name: string; count: number }[]
  porSO: { name: string; count: number }[]
  porPaisYSistema?: { pais: string; sistemas: { name: string; count: number }[] }[]
}



export default function DashboardSeguridad() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCritical, setShowCritical] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getDashboardSecurity()
      setStats(data)
    } catch (error) {
      console.error('Error loading security stats:', error)
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

  const antivirusData = [
    { name: 'Protegidos', value: stats?.conAntivirus || 0 },
    { name: 'Sin Antivirus', value: stats?.sinAntivirus || 0 }
  ]

  const protectedPercentage = stats?.porcentajeProtegido || 0
  const protectionColor = protectedPercentage >= 80 ? 'text-green-600' : protectedPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Seguridad
          </h1>
          <p className="text-gray-500 mt-1">Estado de seguridad de VMs y servidores</p>
        </div>
        
        {/* Protection Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${protectedPercentage >= 80 ? 'bg-green-100' : protectedPercentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
          {protectedPercentage >= 80 ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-bold ${protectionColor}`}>
            {protectedPercentage}% Protegido
          </span>
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
          title="Con Antivirus"
          value={stats?.conAntivirus || 0}
          icon={Shield}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle={`${stats?.porcentajeProtegido || 0}% del total`}
        />
        <StatCard
          title="Sin Antivirus"
          value={stats?.sinAntivirus || 0}
          icon={ShieldOff}
          color="bg-gradient-to-br from-red-500 to-red-600"
          subtitle="Requiere atención"
        />
        <StatCard
          title="Arquitecturas"
          value={stats?.porArquitectura?.length || 0}
          icon={Cpu}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="En uso"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutChartCard 
          data={antivirusData} 
          colors={['#22c55e', '#ef4444']} 
          title="Cobertura Antivirus" 
          icon={Shield}
          colorClass="bg-gradient-to-br from-green-500 to-emerald-500"
        />
        <BarChartCard 
          data={stats?.porAntivirus?.slice(0, 6)?.map((a: any) => ({ name: a.antivirus, count: a.count })) || []} 
          title="Distribución por Antivirus" 
          icon={Shield}
          colorClass="bg-gradient-to-br from-blue-500 to-cyan-500"
          layout="vertical"
        />
        <BarChartCard 
          data={stats?.porArquitectura?.map((a: any) => ({ name: a.arquitectura, count: a.count })) || []} 
          title="Arquitecturas" 
          icon={Cpu}
          colorClass="bg-gradient-to-br from-violet-500 to-purple-500"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard 
          data={stats?.porSO?.slice(0, 10)?.map((s: any) => ({ name: s.sistemaOperativo, count: s.count })) || []} 
          title="Por Sistema Operativo" 
          icon={Monitor}
          colorClass="bg-gradient-to-br from-indigo-500 to-purple-500"
        />
        <BarChartCard 
          data={stats?.porSO?.slice(0, 12)?.map((s: any) => ({ name: s.name, count: s.count })) || []} 
          title="SO con Versiones" 
          icon={Globe}
          colorClass="bg-gradient-to-br from-cyan-500 to-blue-500"
          layout="vertical"
        />
      </div>

      {/* VMs Sin Antivirus - Critical Alert */}
      {(stats?.vmsSinAntivirus?.length || 0) > 0 && (
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="pb-2 bg-red-50">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              VMs Sin Antivirus ({stats?.vmsSinAntivirus?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Host</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">VM</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">IP</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">País</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Ambiente</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(showCritical 
                    ? (stats?.vmsSinAntivirus || []) 
                    : (stats?.vmsSinAntivirus?.slice(0, 10) || [])
                  ).map((vm) => (
                    <tr key={vm.id} className="border-b hover:bg-red-50">
                      <td className="py-2 px-2 font-mono text-xs">{vm.host}</td>
                      <td className="py-2 px-2">{vm.nombreVM || '-'}</td>
                      <td className="py-2 px-2 font-mono text-xs">{vm.ip || '-'}</td>
                      <td className="py-2 px-2">{vm.pais}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          vm.ambiente === 'Producción' ? 'bg-red-100 text-red-700' :
                          vm.ambiente === 'Desarrollo' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {vm.ambiente}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          vm.estado === 'Activo' ? 'bg-green-100 text-green-700' :
                          vm.estado === 'Inactivo' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {vm.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(stats?.vmsSinAntivirus?.length || 0) > 10 && !showCritical && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowCritical(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Ver todos ({stats?.vmsSinAntivirus?.length})
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Critical Alerts */}
      {(stats?.vmsSinAntivirus?.length || 0) === 0 && (
        <Card className="border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">¡Todas las VMs tienen antivirus instalado!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

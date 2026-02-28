import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { getServidores, getInventarioFisico } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Servidor, InventarioFisico } from '@/types'
import { FileText, Download, Mail, Calendar, Server, HardDrive, Shield, Cpu, Globe, Users, Activity } from 'lucide-react'
import * as XLSX from 'xlsx'

type ReportType = 'completo' | 'ambiente' | 'pais' | 'sin-antivirus' | 'produccion' | 'estado' | 'arquitectura' | 'sistema-operativo' | 'responsable' | 'inventario-fisico' | 'recursos' | 'disponibilidad'

interface ReportConfig { id: ReportType; label: string; icon: React.ElementType }

const reportConfigs: ReportConfig[] = [
  { id: 'completo', label: 'Inventario Completo', icon: FileText },
  { id: 'ambiente', label: 'Por Ambiente', icon: Activity },
  { id: 'pais', label: 'Por País', icon: Globe },
  { id: 'estado', label: 'Por Estado', icon: Activity },
  { id: 'arquitectura', label: 'Por Arquitectura', icon: Cpu },
  { id: 'sistema-operativo', label: 'Por Sistema Operativo', icon: Server },
  { id: 'responsable', label: 'Por Responsable', icon: Users },
  { id: 'sin-antivirus', label: 'Sin Antivirus', icon: Shield },
  { id: 'produccion', label: 'Solo Producción', icon: Server },
  { id: 'recursos', label: 'Recursos', icon: Cpu },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: Activity },
  { id: 'inventario-fisico', label: 'Inventario Físico', icon: HardDrive },
]

export default function Reports() {
  const [servidores, setServidores] = useState<Servidor[]>([])
  const [inventarioFisico, setInventarioFisico] = useState<InventarioFisico[]>([])
  const [reportType, setReportType] = useState<ReportType>('completo')
  const [filterValue, setFilterValue] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])
  const loadData = async () => { try { const [s, f] = await Promise.all([getServidores(), getInventarioFisico()]); setServidores(s); setInventarioFisico(f) } catch (e) { console.error(e) } }

  const getFilteredData = () => {
    const data = servidores || []
    switch (reportType) {
      case 'ambiente': return filterValue ? data.filter(s => (s.ambiente || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'pais': return filterValue ? data.filter(s => (s.pais || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'sin-antivirus': return data.filter(s => !s.antivirus || (s.antivirus || '').trim() === '' || s.antivirus.toLowerCase() === 'ninguno')
      case 'produccion': return data.filter(s => (s.ambiente || '').toLowerCase().trim() === 'produccion')
      case 'estado': return filterValue ? data.filter(s => (s.estado || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'arquitectura': return filterValue ? data.filter(s => (s.arquitectura || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'sistema-operativo': return filterValue ? data.filter(s => (s.sistemaOperativo || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'responsable': return filterValue ? data.filter(s => (s.responsable || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
      case 'recursos': return data.filter(s => s.cpu || s.memoria || s.disco)
      default: return data
    }
  }

  const getFilteredFisico = () => {
    const data = inventarioFisico || []
    if (reportType === 'inventario-fisico') return filterValue ? data.filter(e => (e.estado || '').toLowerCase().trim() === filterValue.toLowerCase().trim() || (e.categoria || '').toLowerCase().trim() === filterValue.toLowerCase().trim()) : data
    return []
  }

  const getReportTitle = () => {
    const t: Record<ReportType, string> = { completo: 'Inventario Completo', ambiente: `Ambiente: ${filterValue}`, pais: `País: ${filterValue}`, 'sin-antivirus': 'Sin Antivirus', produccion: 'Producción', estado: `Estado: ${filterValue}`, arquitectura: `Arquitectura: ${filterValue}`, 'sistema-operativo': `SO: ${filterValue}`, responsable: `Responsable: ${filterValue}`, recursos: 'Recursos', disponibilidad: 'Disponibilidad', 'inventario-fisico': 'Inventario Físico' }
    return `Informe - ${t[reportType]}`
  }

  const getFilterOptions = () => {
    switch (reportType) {
      case 'ambiente': return [...new Set((servidores || []).map(s => s.ambiente).filter(Boolean))]
      case 'pais': return [...new Set((servidores || []).map(s => s.pais).filter(Boolean))]
      case 'estado': return [...new Set((servidores || []).map(s => s.estado).filter(Boolean))]
      case 'arquitectura': return [...new Set((servidores || []).map(s => s.arquitectura).filter(Boolean))]
      case 'sistema-operativo': return [...new Set((servidores || []).map(s => s.sistemaOperativo).filter(Boolean))]
      case 'responsable': return [...new Set((servidores || []).map(s => s.responsable).filter(Boolean))]
      case 'inventario-fisico': return [...new Set((inventarioFisico || []).map(e => e.estado).filter(Boolean))]
      default: return []
    }
  }

  const getFilterLabel = () => ({ ambiente: 'Ambiente', pais: 'País', estado: 'Estado', arquitectura: 'Arquitectura', 'sistema-operativo': 'Sistema Operativo', responsable: 'Responsable', 'inventario-fisico': 'Estado', completo: 'Filtro', 'sin-antivirus': 'Filtro', produccion: 'Filtro', recursos: 'Filtro', disponibilidad: 'Filtro' }[reportType] || 'Filtro')

  const exportToExcel = () => {
    setLoading(true)
    try {
      const isFisico = reportType === 'inventario-fisico'
      const data = isFisico ? getFilteredFisico().map(e => ({ 'País': e.pais, 'Categoría': e.categoria, 'Equipo': e.equipo, 'Marca': e.marca, 'Modelo': e.modelo, 'Serie': e.serie, 'Estado': e.estado, 'Responsable': e.responsable, 'IP': e.direccionIp })) : getFilteredData().map(s => ({ 'País': s.pais, 'Host': s.host, 'VM': s.nombreVM, 'IP': s.ip, 'CPU': s.cpu, 'Memoria': s.memoria, 'Disco': s.disco, 'Ambiente': s.ambiente, 'Estado': s.estado, 'Responsable': s.responsable }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, isFisico ? 'Físico' : 'Servidores')
      XLSX.writeFile(wb, `informe_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: 'Informe Excel generado correctamente' })
    } catch { toast({ variant: 'destructive', title: 'Error al generar informe' }) }
    finally { setLoading(false) }
  }

  const exportToCSV = () => {
    setLoading(true)
    try {
      const isFisico = reportType === 'inventario-fisico'
      const data = isFisico ? getFilteredFisico() : getFilteredData()
      const headers = isFisico ? ['País', 'Categoría', 'Equipo', 'Marca', 'Modelo', 'Estado', 'Responsable'] : ['País', 'Host', 'VM', 'IP', 'CPU', 'Memoria', 'Disco', 'Ambiente', 'Estado', 'Responsable']
      const rows = data.map((s: any) => headers.map(h => `"${s[h.toLowerCase().replace(/ /g, '')] || ''}"`))
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = window.URL.createObjectURL(blob)
      a.download = `informe_${reportType}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      toast({ title: 'Informe CSV generado correctamente' })
    } catch { toast({ variant: 'destructive', title: 'Error al generar informe' }) }
    finally { setLoading(false) }
  }

  const getStats = () => {
    const data = getFilteredData()
    return { total: data.length, activos: data.filter(s => s.estado === 'Activo').length, inactivos: data.filter(s => s.estado === 'Inactivo').length, produccion: data.filter(s => s.ambiente === 'Producción').length, sinAntivirus: data.filter(s => !s.antivirus || s.antivirus.trim() === '').length, totalCpu: data.reduce((acc, s) => acc + (parseInt(String(s.cpu)) || 0), 0), totalMemoria: data.reduce((acc, s) => acc + (parseInt(String(s.memoria).replace(/[^0-9]/g, '')) || 0), 0), totalDisco: data.reduce((acc, s) => acc + (parseInt(String(s.disco).replace(/[^0-9]/g, '')) || 0), 0) }
  }

  const filterOptions = getFilterOptions()
  const showFilter = filterOptions.length > 0
  const isFisico = reportType === 'inventario-fisico'
  const stats = !isFisico ? getStats() : null
  const currentData = isFisico ? getFilteredFisico() : getFilteredData()

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900">Informes</h1><p className="text-gray-500 mt-1">Genere informes del inventario</p></div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Seleccionar Tipo de Informe</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {reportConfigs.map((config) => (
              <button key={config.id} onClick={() => { setReportType(config.id); setFilterValue(''); }} className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${reportType === config.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2"><config.icon className={`w-4 h-4 ${reportType === config.id ? 'text-blue-600' : 'text-gray-500'}`} /><span className={`text-sm font-medium ${reportType === config.id ? 'text-blue-700' : 'text-gray-700'}`}>{config.label}</span></div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {showFilter && (<div className="space-y-2"><Label>{getFilterLabel()}</Label><Select value={filterValue || ''} onValueChange={setFilterValue}><SelectTrigger><span>{filterValue || 'Seleccionar...'}</span></SelectTrigger><SelectContent>{filterOptions.filter(Boolean).map(opt => <SelectItem key={opt} value={opt || ''}>{opt}</SelectItem>)}</SelectContent></Select></div>)}
            <div className="pt-4 border-t"><p className="text-sm text-gray-500 mb-3"><Calendar className="w-4 h-4 inline mr-1" />Fecha: {new Date().toLocaleDateString('es-CO')}</p><p className="text-sm font-medium">Total: <span className="text-primary">{currentData.length}</span></p></div>
            {stats && (<div className="pt-4 border-t space-y-2"><p className="text-sm font-medium text-gray-700">Resumen:</p><div className="grid grid-cols-2 gap-2 text-xs"><div className="bg-green-50 p-2 rounded"><span className="text-green-600 font-medium">{stats.activos}</span> Activos</div><div className="bg-red-50 p-2 rounded"><span className="text-red-600 font-medium">{stats.inactivos}</span> Inactivos</div><div className="bg-blue-50 p-2 rounded"><span className="text-blue-600 font-medium">{stats.produccion}</span> Producción</div><div className="bg-yellow-50 p-2 rounded"><span className="text-yellow-600 font-medium">{stats.sinAntivirus}</span> Sin AV</div><div className="bg-purple-50 p-2 rounded col-span-2"><span className="text-purple-600 font-medium">{stats.totalCpu}</span> CPU Total</div><div className="bg-cyan-50 p-2 rounded col-span-2"><span className="text-cyan-600 font-medium">{stats.totalMemoria} GB</span> Memoria</div></div></div>)}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Vista Previa</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
              <h3 className="font-bold text-lg mb-4">{getReportTitle()}</h3>
              <div className="overflow-auto max-h-[250px]">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">{isFisico ? <><th className="text-left p-2">Equipo</th><th className="text-left p-2">Marca</th><th className="text-left p-2">Estado</th><th className="text-left p-2">Responsable</th></> : <><th className="text-left p-2">Host/VM</th><th className="text-left p-2">IP</th><th className="text-left p-2">Ambiente</th><th className="text-left p-2">Estado</th></>}</tr></thead>
                  <tbody>{currentData.slice(0, 10).map((s: any, i: number) => (<tr key={i} className="border-b"><td className="p-2">{isFisico ? s.equipo : (s.nombreVM || s.host)}</td><td className="p-2">{isFisico ? s.marca : s.ip}</td><td className="p-2">{isFisico ? s.estado : s.ambiente}</td><td className="p-2">{isFisico ? s.responsable : s.estado}</td></tr>))}</tbody>
                </table>
                {currentData.length > 10 && <p className="text-center text-gray-500 py-2">... y {currentData.length - 10} más</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={exportToExcel} disabled={loading} className="flex-1"><Download className="w-4 h-4 mr-2" />Excel</Button>
              <Button onClick={exportToCSV} disabled={loading} variant="outline" className="flex-1"><Download className="w-4 h-4 mr-2" />CSV</Button>
              <Button variant="outline" className="flex-1"><Mail className="w-4 h-4 mr-2" />Email</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Informes Programados</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <h4 className="font-medium">Informe Diario</h4>
              <p className="text-sm text-gray-500 mt-1">Se envía diariamente a las 8:00 AM</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <h4 className="font-medium">Informe Semanal</h4>
              <p className="text-sm text-gray-500 mt-1">Se envía cada lunes a las 8:00 AM</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <h4 className="font-medium">Informe Mensual</h4>
              <p className="text-sm text-gray-500 mt-1">Se envía el primer día de cada mes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
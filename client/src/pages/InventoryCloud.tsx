import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getInventarioCloud, createInventarioCloud, updateInventarioCloud, deleteInventarioCloud, importInventarioCloud, bulkDeleteInventarioCloud } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { InventarioCloud } from "@/types/api"
import { Plus, Pencil, Trash2, Search, Download, Upload, Columns2, Check, X, Cloud } from "lucide-react"
import * as XLSX from "xlsx"
import { usePermission } from "@/hooks/usePermission"

const emptyItem: Partial<InventarioCloud> = {
  tenant: "", nube: "", instanceName: "", ipPublica: "", ipPrivada: "", instanceType: "",
  cpu: 0, ram: "", storageGib: "", sistemaOperativo: "", costoUsd: "", hostName: "",
  responsable: "", modoUso: "", service: "", antivirus: ""
}

const allColumns = [
  { key: "tenant", label: "Tenant", default: true }, { key: "nube", label: "Nube", default: true },
  { key: "instanceName", label: "Instance Name", default: true }, { key: "ipPublica", label: "IP Pública", default: true },
  { key: "ipPrivada", label: "IP Privada", default: true }, { key: "instanceType", label: "Instance Type", default: true },
  { key: "cpu", label: "CPU", default: true }, { key: "ram", label: "RAM", default: true },
  { key: "storageGib", label: "Storage (GiB)", default: true }, { key: "sistemaOperativo", label: "S.O.", default: true },
  { key: "costoUsd", label: "Costo (USD)", default: true }, { key: "hostName", label: "Hostname", default: false },
  { key: "antivirus", label: "Antivirus", default: false }, { key: "responsable", label: "Responsable", default: true },
  { key: "modoUso", label: "Modo de Uso", default: false }, { key: "service", label: "Service", default: false },
]

export default function InventoryCloud() {
  const [items, setItems] = useState<InventarioCloud[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventarioCloud | null>(null)
  const [formData, setFormData] = useState<Partial<InventarioCloud>>(emptyItem)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "tenant", "nube", "instanceName", "ipPublica", "ipPrivada", "instanceType",
    "cpu", "ram", "storageGib", "sistemaOperativo", "costoUsd", "antivirus", "responsable"
  ])
  const { toast } = useToast()
  
  // Permisos
  const canCreate = usePermission('inventario_cloud', 'crear')
  const canEdit = usePermission('inventario_cloud', 'editar')
  const canDelete = usePermission('inventario_cloud', 'eliminar')
  const canExport = usePermission('inventario_cloud', 'exportar')

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    try { const data = await getInventarioCloud(); setItems(data) }
    catch (error) { console.error("Error:", error) }
    finally { setLoading(false) }
  }

  const filteredItems = items.filter(s => {
    const globalMatch = Object.values(s).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
    const columnMatch = Object.entries(columnFilters).every(([key, value]) => {
      if (!value) return true
      return String(s[key as keyof InventarioCloud] || "").toLowerCase().includes(value.toLowerCase())
    })
    return globalMatch && columnMatch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) { await updateInventarioCloud(editingItem.id, formData); toast({ title: "Instancia actualizada correctamente" }) }
      else { await createInventarioCloud(formData); toast({ title: "Instancia creada correctamente" }) }
      setIsDialogOpen(false); setFormData(emptyItem); setEditingItem(null); loadItems()
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }) }
  }

  const handleEdit = (item: InventarioCloud) => { setEditingItem(item); setFormData({ ...item }); setIsDialogOpen(true) }

  const handleDelete = async () => {
    if (itemToDelete) {
      try { await deleteInventarioCloud(itemToDelete); toast({ title: "Instancia eliminada" }); loadItems() }
      catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }) }
    }
    setDeleteConfirmOpen(false); setItemToDelete(null)
  }

  const confirmDelete = (id: number) => { setItemToDelete(id); setDeleteConfirmOpen(true) }

  const toggleSelect = (id: number) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) }
  const toggleSelectAll = () => { setSelectedIds(selectedIds.length === filteredItems.length ? [] : filteredItems.map(s => s.id)) }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try { await bulkDeleteInventarioCloud(selectedIds); toast({ title: `${selectedIds.length} instancias eliminadas` }); setSelectedIds([]); setSelectMode(false); loadItems() }
    catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }) }
  }

  const downloadTemplate = () => {
    const templateData = [{ "Tenant": "almoseguridad", "Nube": "AWS", "Instance Name": "prod-web-01", "IP Publica": "1.2.3.4", "IP Privada": "10.0.0.1", "Instance Type": "t3.medium", "CPU": 2, "RAM": "4GB", "Storage": "50", "Sistema Operativo": "Ubuntu 22.04", "Costo USD": "50.00", "Hostname": "ip-10-0-0-1", "Antivirus": "Windows Defender", "Responsable": "Juan Pérez", "Modo Uso": "Producción", "Service": "web" }]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "InventarioCloud")
    ws["!cols"] = [{wch: 15}, {wch: 10}, {wch: 20}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 5}, {wch: 8}, {wch: 12}, {wch: 18}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 12}, {wch: 10}]
    XLSX.writeFile(wb, "plantilla_importacion_cloud.xlsx")
    toast({ title: "Plantilla descargada correctamente" })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      if (!Array.isArray(jsonData) || jsonData.length < 2) { toast({ variant: "destructive", title: "Error", description: "El archivo está vacío o sin datos" }); return }
      
      // Primera fila = headers (ignorar), siguientes = datos
      console.log('Raw row 1:', JSON.stringify(jsonData[1]))
      const dataToSend = jsonData.slice(1).filter((row: any[]) => row && row.length > 0).map((row: any[]) => ({
        tenant: row[0] !== undefined ? String(row[0]).trim() : null,
        nube: row[1] !== undefined ? String(row[1]).trim() : null,
        instanceName: row[2] !== undefined ? String(row[2]).trim() : null,
        ipPublica: row[3] !== undefined ? String(row[3]).trim() : null,
        ipPrivada: row[4] !== undefined ? String(row[4]).trim() : null,
        instanceType: row[5] !== undefined ? String(row[5]).trim() : null,
        cpu: parseInt(String(row[6] || "0").replace(/\s/g, '')) || 0,
        ram: row[7] !== undefined ? String(row[7]).trim() : null,
        storageGib: row[8] !== undefined ? String(row[8]).trim() : null,
        sistemaOperativo: row[9] !== undefined ? String(row[9]).trim() : null,
        costoUsd: row[10] !== undefined ? String(row[10]).trim() : null,
        hostName: row[11] !== undefined ? String(row[11]).trim() : null,
        antivirus: row[12] !== undefined ? String(row[12]).trim() : null,
        responsable: row[13] !== undefined ? String(row[13]).trim() : null,
        modoUso: row[14] !== undefined ? String(row[14]).trim() : null,
        service: row[15] !== undefined ? String(row[15]).trim() : null
      }))
      
      console.log('First item to send:', JSON.stringify(dataToSend[0]))
      
      const result = await importInventarioCloud(dataToSend)
      toast({ title: result.message || `${result.count} instancias importadas correctamente` })
      loadItems()
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }) }
    finally { e.target.value = "" }
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(items.map(s => ({
      "Tenant": s.tenant, "Nube": s.nube, "Instance Name": s.instanceName, "IP Pública": s.ipPublica, "IP Privada": s.ipPrivada, "Instance Type": s.instanceType,
      "CPU": s.cpu, "RAM": s.ram, "Storage (GiB)": s.storageGib, "Sistema Operativo": s.sistemaOperativo, "Costo (USD)": s.costoUsd,
      "Hostname": s.hostName, "Antivirus": s.antivirus, "Responsable": s.responsable, "Modo de Uso": s.modoUso, "Service": s.service
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "InventarioCloud")
    XLSX.writeFile(wb, "inventario_cloud.xlsx")
    toast({ title: "Exportado a Excel correctamente" })
  }

  const getNubeColor = (nube: string) => {
    switch (nube?.toLowerCase()) {
      case "aws": return "bg-yellow-100 text-yellow-800"
      case "azure": return "bg-blue-100 text-blue-800"
      case "gcp": return "bg-green-100 text-green-800"
      case "oracle cloud": return "bg-red-100 text-red-800"
      case "ibm cloud": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const toggleColumn = (key: string) => { setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]) }

  const renderCell = (item: InventarioCloud, key: string) => {
    const value = item[key as keyof InventarioCloud]
    if (key === "nube" && value) { return <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNubeColor(String(value))}`}>{String(value)}</span> }
    if (key === "ipPublica" || key === "ipPrivada") return <span className="font-mono text-sm">{String(value) || "-"}</span>
    if (key === "cpu" || key === "costoUsd") return <span className="font-medium">{String(value) || "-"}</span>
    if (value === null || value === undefined) return null
    return String(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Cloud className="w-8 h-8 text-blue-500" />Inventario Cloud</h1>
          <p className="text-gray-500 mt-1">Gestione el inventario de servicios en la nube</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Plantilla</Button>
          <div className="relative">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="file-upload-cloud" />
            <Button variant="outline" type="button"><Upload className="w-4 h-4 mr-2" />Importar</Button>
          </div>
          <Button variant="outline" onClick={exportToExcel} disabled={!canExport}><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button variant="outline" onClick={() => setColumnsDialogOpen(true)}><Columns2 className="w-4 h-4 mr-2" />Columnas</Button>
          {selectMode ? (
            <><Button variant="outline" onClick={() => { setSelectMode(false); setSelectedIds([]) }}><X className="w-4 h-4 mr-2" />Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedIds.length === 0}><Trash2 className="w-4 h-4 mr-2" />Eliminar ({selectedIds.length})</Button></>
          ) : (
            <Button onClick={() => setSelectMode(true)}><Check className="w-4 h-4 mr-2" />Seleccionar</Button>
          )}
          <Button onClick={() => { setFormData(emptyItem); setEditingItem(null); setIsDialogOpen(true) }} disabled={!canCreate}><Plus className="w-4 h-4 mr-2" />Nueva Instancia</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Search className="w-5 h-5 text-gray-400" /><Input placeholder="Buscar en el inventario..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-auto w-full">
                <TableHeader>
                  <TableRow>
                    {selectMode && (<TableHead className="w-10"><input type="checkbox" checked={selectedIds.length === filteredItems.length && filteredItems.length > 0} onChange={toggleSelectAll} className="w-4 h-4" /></TableHead>)}
                    {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <TableHead key={col.key} className="px-1 py-1 text-xs">
                        <div className="flex flex-col gap-1"><span>{col.label}</span><input type="text" placeholder="Filtrar..." value={columnFilters[col.key] || ""} onChange={(e) => setColumnFilters(prev => ({...prev, [col.key]: e.target.value}))} className="text-xs border rounded px-1 py-0.5 w-full" /></div>
                      </TableHead>))}
                    {!selectMode && <TableHead className="text-right w-20">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow><TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-gray-500">No hay instancias registradas</TableCell></TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className={selectedIds.includes(item.id) ? "bg-blue-50" : ""}>
                        {selectMode && (<TableCell><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4" /></TableCell>)}
                        {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => (<TableCell key={col.key} className="px-2 py-2 text-sm">{renderCell(item, col.key)}</TableCell>))}
                        {!selectMode && (<TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEdit(item)} disabled={!canEdit}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="sm" onClick={() => confirmDelete(item.id)} disabled={!canDelete}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>)}
                      </TableRow>)))}
                </TableBody>
              </Table>
            </div>)}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Instancia" : "Nueva Instancia"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><Label>Tenant *</Label><Input value={formData.tenant || ""} onChange={e => setFormData({...formData, tenant: e.target.value})} required /></div>
            <div><Label>Nube *</Label><select value={formData.nube || ""} onChange={e => setFormData({...formData, nube: e.target.value})} className="w-full border rounded-md px-3 py-2" required><option value="">Seleccionar</option><option value="AWS">AWS</option><option value="Azure">Azure</option><option value="GCP">GCP</option><option value="Oracle Cloud">Oracle Cloud</option><option value="IBM Cloud">IBM Cloud</option><option value="Otro">Otro</option></select></div>
            <div><Label>Instance Name *</Label><Input value={formData.instanceName || ""} onChange={e => setFormData({...formData, instanceName: e.target.value})} required /></div>
            <div><Label>IP Pública</Label><Input value={formData.ipPublica || ""} onChange={e => setFormData({...formData, ipPublica: e.target.value})} /></div>
            <div><Label>IP Privada</Label><Input value={formData.ipPrivada || ""} onChange={e => setFormData({...formData, ipPrivada: e.target.value})} /></div>
            <div><Label>Instance Type</Label><Input value={formData.instanceType || ""} onChange={e => setFormData({...formData, instanceType: e.target.value})} /></div>
            <div><Label>CPU</Label><Input type="number" value={formData.cpu || ""} onChange={e => setFormData({...formData, cpu: parseInt(e.target.value) || 0})} /></div>
            <div><Label>RAM</Label><Input value={formData.ram || ""} onChange={e => setFormData({...formData, ram: e.target.value})} placeholder="ej: 4GB" /></div>
            <div><Label>Storage (GiB)</Label><Input value={formData.storageGib || ""} onChange={e => setFormData({...formData, storageGib: e.target.value})} placeholder="ej: 50" /></div>
            <div><Label>Sistema Operativo</Label><Input value={formData.sistemaOperativo || ""} onChange={e => setFormData({...formData, sistemaOperativo: e.target.value})} /></div>
            <div><Label>Costo (USD)</Label><Input value={formData.costoUsd || ""} onChange={e => setFormData({...formData, costoUsd: e.target.value})} placeholder="ej: 50.00" /></div>
            <div><Label>Hostname</Label><Input value={formData.hostName || ""} onChange={e => setFormData({...formData, hostName: e.target.value})} /></div>
            <div><Label>Antivirus</Label><Input value={formData.antivirus || ""} onChange={e => setFormData({...formData, antivirus: e.target.value})} placeholder="ej: Ninguno, Windows Defender" /></div>
            <div><Label>Responsable</Label><Input value={formData.responsable || ""} onChange={e => setFormData({...formData, responsable: e.target.value})} /></div>
            <div><Label>Modo de Uso</Label><Input value={formData.modoUso || ""} onChange={e => setFormData({...formData, modoUso: e.target.value})} placeholder="ej: Producción, Desarrollo" /></div>
            <div><Label>Service</Label><Input value={formData.service || ""} onChange={e => setFormData({...formData, service: e.target.value})} /></div>
            <DialogFooter className="col-span-2 mt-4"><Button type="submit">{editingItem ? "Actualizar" : "Crear"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle>Confirmar eliminación</DialogTitle></DialogHeader><p>¿Está seguro de eliminar esta instancia?</p><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Eliminar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Seleccionar Columnas</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">{allColumns.map(col => (<label key={col.key} className="flex items-center gap-2"><input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} />{col.label}</label>))}</div>
          <DialogFooter><Button onClick={() => setColumnsDialogOpen(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

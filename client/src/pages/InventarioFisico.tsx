import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { getInventarioFisico, createInventarioFisico, updateInventarioFisico, deleteInventarioFisico, deleteInventarioFisicoBulk, importInventarioFisico } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Search, Download, Upload, Check, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { usePermission } from '@/hooks/usePermission'

const emptyItem = {
  pais: '',
  equipo: '',
  responsable: '',
  direccionIp: '',
  ilo: '',
  categoria: '',
  descripcion: '',
  marca: '',
  modelo: '',
  serial: '',
  sistemaOperativo: '',
  garantia: ''
}

export default function InventarioFisico() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState(emptyItem)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const { toast } = useToast()
  
  // Permisos
  const canCreate = usePermission('inventario_fisico', 'crear')
  const canEdit = usePermission('inventario_fisico', 'editar')
  const canDelete = usePermission('inventario_fisico', 'eliminar')
  const canExport = usePermission('inventario_fisico', 'exportar')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const data = await getInventarioFisico()
      setItems(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(s => 
    Object.values(s).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await updateInventarioFisico(editingItem.id, formData)
        toast({ title: 'Item actualizado correctamente' })
      } else {
        await createInventarioFisico(formData)
        toast({ title: 'Item creado correctamente' })
      }
      setIsDialogOpen(false)
      setFormData(emptyItem)
      setEditingItem(null)
      loadItems()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      pais: item.pais || '',
      equipo: item.equipo || '',
      responsable: item.responsable || '',
      direccionIp: item.direccionIp || '',
      ilo: item.ilo || '',
      categoria: item.categoria || '',
      descripcion: item.descripcion || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      serial: item.serial || '',
      sistemaOperativo: item.sistemaOperativo || '',
      garantia: item.garantia || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (itemToDelete === null) return
    try {
      await deleteInventarioFisico(itemToDelete)
      toast({ title: 'Item eliminado' })
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      loadItems()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map(i => i.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      await deleteInventarioFisicoBulk(selectedIds)
      toast({ title: `${selectedIds.length} equipos eliminados` })
      setSelectedIds([])
      setSelectMode(false)
      loadItems()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'El archivo está vacío' })
        return
      }

      const mappedData = jsonData.map((row: any) => ({
        pais: row['País'] || row['pais'] || row['Pais'] || '',
        equipo: row['Equipo'] || row['equipo'] || '',
        responsable: row['Responsable'] || row['responsable'] || '',
        direccionIp: row['Dirección IP'] || row['direccionIp'] || row['IP'] || '',
        ilo: row['ILO'] || row['ilo'] || '',
        categoria: row['Categoría'] || row['categoria'] || row['Categoria'] || '',
        descripcion: row['Descripción'] || row['descripcion'] || row['Descripcion'] || '',
        marca: row['Marca'] || row['marca'] || '',
        modelo: row['Modelo'] || row['modelo'] || '',
        serial: row['Serial'] || row['serial'] || row['N° Serie'] || '',
        sistemaOperativo: row['Sistema Operativo'] || row['sistemaOperativo'] || row['SO'] || '',
        garantia: row['Garantía'] || row['garantia'] || row['Garantia'] || ''
      }))

      const result = await importInventarioFisico(mappedData)
      toast({ title: result.message || `${result.count} items importados correctamente` })
      loadItems()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      e.target.value = ''
    }
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(items.map(s => ({
      'País': s.pais,
      'Equipo': s.equipo,
      'Responsable': s.responsable,
      'Dirección IP': s.direccionIp,
      'ILO': s.ilo,
      'Categoría': s.categoria,
      'Descripción': s.descripcion,
      'Marca': s.marca,
      'Modelo': s.modelo,
      'Serial': s.serial,
      'Sistema Operativo': s.sistemaOperativo,
      'Garantía': s.garantia
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Físico')
    XLSX.writeFile(wb, 'inventario_fisico.xlsx')
  }

  const downloadTemplate = () => {
    const template = [{
      'País': '',
      'Equipo': '',
      'Responsable': '',
      'Dirección IP': '',
      'ILO': '',
      'Categoría': '',
      'Descripción': '',
      'Marca': '',
      'Modelo': '',
      'Serial': '',
      'Sistema Operativo': '',
      'Garantía': ''
    }]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_inventario_fisico.xlsx')
  }

  const openNewDialog = () => {
    setEditingItem(null)
    setFormData(emptyItem)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventario Físico</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Plantilla
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={!canExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('file-input-fisico')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <input id="file-input-fisico" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          {selectMode ? (
            <>
              <Button variant="outline" onClick={() => { setSelectMode(false); setSelectedIds([]) }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedIds.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar ({selectedIds.length})
              </Button>
            </>
          ) : (
            <Button onClick={() => setSelectMode(true)}>
              <Check className="h-4 w-4 mr-2" />
              Seleccionar
            </Button>
          )}
          <Button onClick={openNewDialog} disabled={!canCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {selectMode && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>
                )}
                <TableHead>País</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>ILO</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>SO</TableHead>
                <TableHead>Garantía</TableHead>
                {!selectMode && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={selectMode ? 13 : 12}>Cargando...</TableCell></TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={selectMode ? 13 : 12}>No hay registros</TableCell></TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className={selectedIds.includes(item.id) ? 'bg-blue-50' : ''}>
                    {selectMode && (
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                    )}
                    <TableCell>{item.pais}</TableCell>
                    <TableCell>{item.equipo}</TableCell>
                    <TableCell>{item.responsable}</TableCell>
                    <TableCell>{item.direccionIp}</TableCell>
                    <TableCell>{item.ilo}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.marca}</TableCell>
                    <TableCell>{item.modelo}</TableCell>
                    <TableCell>{item.serial}</TableCell>
                    <TableCell>{item.sistemaOperativo}</TableCell>
                    <TableCell>{item.garantia}</TableCell>
                    {!selectMode && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!canEdit}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(item.id); setDeleteConfirmOpen(true) }} disabled={!canDelete}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} Equipo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>País</Label>
                <Input value={formData.pais} onChange={e => setFormData({...formData, pais: e.target.value})} />
              </div>
              <div>
                <Label>Equipo</Label>
                <Input value={formData.equipo} onChange={e => setFormData({...formData, equipo: e.target.value})} />
              </div>
              <div>
                <Label>Responsable</Label>
                <Input value={formData.responsable} onChange={e => setFormData({...formData, responsable: e.target.value})} />
              </div>
              <div>
                <Label>Dirección IP</Label>
                <Input value={formData.direccionIp} onChange={e => setFormData({...formData, direccionIp: e.target.value})} />
              </div>
              <div>
                <Label>ILO</Label>
                <Input value={formData.ilo} onChange={e => setFormData({...formData, ilo: e.target.value})} />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Input value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
              </div>
              <div>
                <Label>Serial</Label>
                <Input value={formData.serial} onChange={e => setFormData({...formData, serial: e.target.value})} />
              </div>
              <div>
                <Label>Sistema Operativo</Label>
                <Input value={formData.sistemaOperativo} onChange={e => setFormData({...formData, sistemaOperativo: e.target.value})} />
              </div>
              <div>
                <Label>Garantía</Label>
                <Input value={formData.garantia} onChange={e => setFormData({...formData, garantia: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p>¿Está seguro de eliminar este equipo?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

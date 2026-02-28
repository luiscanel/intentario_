import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, inventarioFisicoSchema, inventarioFisicoUpdateSchema, inventarioFisicoImportSchema, bulkDeleteSchema } from '../validations/index.js'

const router = Router()

router.use(authMiddleware)

// Obtener todos los items
router.get('/', async (req, res) => {
  try {
    const items = await prisma.inventarioFisico.findMany({
      orderBy: { id: 'desc' }
    })
    res.json({ success: true, data: items })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener inventario físico',
      code: 'FETCH_ERROR'
    })
  }
})

// Crear item
router.post('/', validate(inventarioFisicoSchema), async (req, res) => {
  try {
    const item = await prisma.inventarioFisico.create({
      data: req.body
    })
    res.status(201).json({ success: true, data: item })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear item',
      code: 'CREATE_ERROR'
    })
  }
})

// Actualizar item
router.put('/:id', validate(inventarioFisicoUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const item = await prisma.inventarioFisico.update({
      where: { id: parseInt(id) },
      data: req.body
    })
    res.json({ success: true, data: item })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar item',
      code: 'UPDATE_ERROR'
    })
  }
})

// Eliminar item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.inventarioFisico.delete({
      where: { id: parseInt(id) }
    })
    res.json({ success: true, message: 'Item eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar item',
      code: 'DELETE_ERROR'
    })
  }
})

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), async (req, res) => {
  try {
    const { ids } = req.body
    
    // Convertir strings a números
    const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    
    await prisma.inventarioFisico.deleteMany({
      where: { id: { in: numericIds } }
    })
    res.json({ success: true, message: `${numericIds.length} equipos eliminados` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error en eliminación masiva',
      code: 'BULK_DELETE_ERROR'
    })
  }
})

// Importar items
router.post('/import', validate(inventarioFisicoImportSchema), async (req, res) => {
  try {
    const { items } = req.body

    const str = (v: any) => {
      if (v === null || v === undefined) return ''
      const trimmed = String(v).trim()
      return trimmed || ''
    }

    const dataToInsert = items.map((s: any) => ({
      pais: str(s.pais) || 'Colombia',
      categoria: str(s.categoria) || 'Servidor',
      marca: str(s.marca) || 'Dell',
      modelo: str(s.modelo),
      serie: str(s.serie),
      inventario: str(s.inventario),
      estado: str(s.estado) || 'Activo',
      responsable: str(s.responsable),
      observaciones: str(s.observaciones) || str(s.descripcion),
      equipo: str(s.equipo),
      direccionIp: str(s.direccionIp),
      ilo: str(s.ilo),
      serial: str(s.serial),
      sistemaOperativo: str(s.sistemaOperativo),
      garantia: str(s.garantia)
    }))

    // Filtrar items válidos (al menos equipo, IP o serie)
    const validData = dataToInsert.filter((s: any) => s.equipo || s.direccionIp || s.serie)
    
    if (validData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No hay items válidos para importar',
        code: 'NO_VALID_ITEMS'
      })
    }

    let created = 0
    let skipped = 0

    for (const item of validData) {
      try {
        await prisma.inventarioFisico.create({ data: item })
        created++
      } catch (e: any) {
        // Ignorar duplicados
        skipped++
      }
    }

    res.json({ 
      success: true, 
      message: `${created} items importados correctamente`, 
      count: created, 
      skipped 
    })
  } catch (error: any) {
    console.error('Error importing:', error)
    res.status(500).json({ 
      success: false, 
      message: `Error al importar: ${error.message}`,
      code: 'IMPORT_ERROR'
    })
  }
})

export default router

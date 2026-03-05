import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, licenciaSchema, licenciaUpdateSchema, bulkDeleteSchema } from '../validations/index.js'

const router = Router()

router.use(authMiddleware)

// Obtener todas las licencias
router.get('/', async (req, res) => {
  try {
    const licencias = await prisma.licencia.findMany({
      orderBy: { nombre: 'asc' },
      include: { proveedor: true, servidor: true }
    })
    res.json({ success: true, data: licencias })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener licencias' })
  }
})

// Obtener licencias por vencer (próximos 30 días)
router.get('/por-vencer', async (req, res) => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + 30)
    
    const licencias = await prisma.licencia.findMany({
      where: {
        fechaVencimiento: { lte: fechaLimite },
        activa: true
      },
      orderBy: { fechaVencimiento: 'asc' },
      include: { proveedor: true }
    })
    res.json({ success: true, data: licencias })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener licencias por vencer' })
  }
})

// Obtener licencia por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const licencia = await prisma.licencia.findUnique({
      where: { id: parseInt(id) },
      include: { proveedor: true }
    })
    if (!licencia) {
      return res.status(404).json({ success: false, message: 'Licencia no encontrada' })
    }
    res.json({ success: true, data: licencia })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener licencia' })
  }
})

// Crear licencia
router.post('/', validate(licenciaSchema), async (req, res) => {
  try {
    const licencia = await prisma.licencia.create({ data: req.body })
    res.status(201).json({ success: true, data: licencia })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear licencia' })
  }
})

// Actualizar licencia
router.put('/:id', validate(licenciaUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const licencia = await prisma.licencia.update({
      where: { id: parseInt(id) },
      data: req.body
    })
    res.json({ success: true, data: licencia })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar licencia' })
  }
})

// Eliminar licencia
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.licencia.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Licencia eliminada' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar licencia' })
  }
})

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), async (req, res) => {
  try {
    const { ids } = req.body
    const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    await prisma.licencia.deleteMany({ where: { id: { in: numericIds } } })
    res.json({ success: true, message: `${numericIds.length} licencias eliminadas` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error en eliminación masiva' })
  }
})

export default router

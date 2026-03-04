import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, proveedorSchema, proveedorUpdateSchema, bulkDeleteSchema } from '../validations/index.js'

const router = Router()

router.use(authMiddleware)

// Obtener todos los proveedores
router.get('/', async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' }
    })
    res.json({ success: true, data: proveedores })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener proveedores', code: 'FETCH_ERROR' })
  }
})

// Obtener proveedor por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: parseInt(id) },
      include: {
        contratos: { orderBy: { fechaInicio: 'desc' } },
        licencias: { orderBy: { fechaVencimiento: 'asc' } }
      }
    })
    if (!proveedor) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' })
    }
    res.json({ success: true, data: proveedor })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener proveedor' })
  }
})

// Crear proveedor
router.post('/', validate(proveedorSchema), async (req, res) => {
  try {
    const proveedor = await prisma.proveedor.create({ data: req.body })
    res.status(201).json({ success: true, data: proveedor })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear proveedor' })
  }
})

// Actualizar proveedor
router.put('/:id', validate(proveedorUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const proveedor = await prisma.proveedor.update({
      where: { id: parseInt(id) },
      data: req.body
    })
    res.json({ success: true, data: proveedor })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar proveedor' })
  }
})

// Eliminar proveedor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.proveedor.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Proveedor eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar proveedor' })
  }
})

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), async (req, res) => {
  try {
    const { ids } = req.body
    const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    await prisma.proveedor.deleteMany({ where: { id: { in: numericIds } } })
    res.json({ success: true, message: `${numericIds.length} proveedores eliminados` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error en eliminación masiva' })
  }
})

export default router

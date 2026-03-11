import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, licenciaSchema, licenciaUpdateSchema, bulkDeleteSchema } from '../validations/index.js'

const router = Router()

router.use(authMiddleware)

// Obtener todas las licencias
router.get('/', async (req, res) => {
  try {
    // Usar raw query con CAST para evitar problemas de conversión de fechas en SQLite
    const licencias = await prisma.$queryRaw`
      SELECT 
        l.id, l.nombre, l.tipo, l.version, l.cantidad, l.usada, 
        l.costo, l.moneda, 
        CAST(l.fechaCompra AS TEXT) as fechaCompra,
        CAST(l.fechaVencimiento AS TEXT) as fechaVencimiento,
        l.proveedorId, l.servidorId, l.notas, l.activa,
        CAST(l.createdAt AS TEXT) as createdAt,
        CAST(l.updatedAt AS TEXT) as updatedAt,
        p.nombre as proveedorNombre, p.email as proveedorEmail, p.telefono as proveedorTelefono,
        s.host as servidorHost, s.ip as servidorIp
      FROM Licencia l
      LEFT JOIN Proveedor p ON l.proveedorId = p.id
      LEFT JOIN Servidor s ON l.servidorId = s.id
      ORDER BY l.nombre ASC
    `
    
    // Transformar resultado
    const data = (licencias as any[]).map((l) => ({
      id: l.id,
      nombre: l.nombre,
      tipo: l.tipo,
      version: l.version,
      cantidad: l.cantidad,
      usada: l.usada,
      costo: l.costo,
      moneda: l.moneda,
      fechaCompra: l.fechaCompra,
      fechaVencimiento: l.fechaVencimiento,
      proveedorId: l.proveedorId,
      servidorId: l.servidorId,
      notas: l.notas,
      activa: l.activa,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      proveedor: l.proveedorId ? {
        id: l.proveedorId,
        nombre: l.proveedorNombre,
        email: l.proveedorEmail,
        telefono: l.proveedorTelefono
      } : null,
      servidor: l.servidorId ? {
        id: l.servidorId,
        host: l.servidorHost,
        ip: l.servidorIp
      } : null
    }))
    
    res.json({ success: true, data })
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

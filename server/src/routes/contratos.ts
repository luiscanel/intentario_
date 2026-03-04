import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, contratoSchema, contratoUpdateSchema, bulkDeleteSchema } from '../validations/index.js'

const router = Router()

router.use(authMiddleware)

// Obtener todos los contratos
router.get('/', async (req, res) => {
  try {
    const { estado, proveedorId, tipo, buscar } = req.query
    
    const where: any = {}
    
    if (estado) where.estado = estado as string
    if (proveedorId) where.proveedorId = parseInt(proveedorId as string)
    if (tipo) where.tipo = tipo as string
    if (buscar) {
      where.OR = [
        { objeto: { contains: buscar as string } },
        { numero: { contains: buscar as string } },
        { observaciones: { contains: buscar as string } }
      ]
    }

    const contratos = await prisma.contrato.findMany({
      where,
      orderBy: { fechaFin: 'asc' },
      include: { 
        proveedor: true,
        documentos: true
      }
    })
    res.json({ success: true, data: contratos })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener contratos' })
  }
})

// Obtener contratos por vencer
router.get('/por-vencer', async (req, res) => {
  try {
    const { dias = 30 } = req.query
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias as string))
    
    const contratos = await prisma.contrato.findMany({
      where: {
        fechaFin: { lte: fechaLimite },
        estado: 'Activo'
      },
      orderBy: { fechaFin: 'asc' },
      include: { proveedor: true }
    })
    res.json({ success: true, data: contratos })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener contratos por vencer' })
  }
})

// Obtener estadísticas de contratos
router.get('/estadisticas', async (req, res) => {
  try {
    const ahora = new Date()
    const proximoMes = new Date()
    proximoMes.setMonth(proximoMes.getMonth() + 1)
    const proximaSemana = new Date()
    proximaSemana.setDate(proximaSemana.getDate() + 7)

    const [total, activos, porVencer, porVencerSemana, vencidos, porMonto] = await Promise.all([
      prisma.contrato.count(),
      prisma.contrato.count({ where: { estado: 'Activo' } }),
      prisma.contrato.count({ 
        where: { 
          fechaFin: { lte: proximoMes },
          estado: 'Activo'
        } 
      }),
      prisma.contrato.count({ 
        where: { 
          fechaFin: { lte: proximaSemana },
          estado: 'Activo'
        } 
      }),
      prisma.contrato.count({ 
        where: { 
          fechaFin: { lt: ahora },
          estado: 'Activo'
        } 
      }),
      prisma.contrato.aggregate({
        where: { estado: 'Activo' },
        _sum: { monto: true }
      })
    ])

    // Contratos por tipo
    const porTipo = await prisma.contrato.groupBy({
      by: ['tipo'],
      _count: { id: true }
    })

    // Contratos por proveedor
    const porProveedor = await prisma.contrato.groupBy({
      by: ['proveedorId'],
      _count: { id: true },
      where: { proveedorId: { not: null } }
    })

    // Obtener nombres de proveedores
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: porProveedor.map(p => p.proveedorId!) } },
      select: { id: true, nombre: true }
    })

    res.json({ 
      success: true, 
      data: {
        total,
        activos,
        porVencer,
        porVencerSemana,
        vencidos,
        montoTotal: porMonto._sum.monto || 0,
        porTipo: porTipo.map(p => ({ tipo: p.tipo, cantidad: p._count.id })),
        porProveedor: porProveedor.map(p => ({
          proveedorId: p.proveedorId,
          proveedor: proveedores.find(pr => pr.id === p.proveedorId)?.nombre,
          cantidad: p._count.id
        }))
      }
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
  }
})

// Obtener contrato por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const contrato = await prisma.contrato.findUnique({
      where: { id: parseInt(id) },
      include: { 
        proveedor: true,
        documentos: true
      }
    })
    if (!contrato) {
      return res.status(404).json({ success: false, message: 'Contrato no encontrado' })
    }
    res.json({ success: true, data: contrato })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener contrato' })
  }
})

// Crear contrato
router.post('/', validate(contratoSchema), async (req, res) => {
  try {
    const contrato = await prisma.contrato.create({ 
      data: req.body,
      include: { proveedor: true }
    })
    res.status(201).json({ success: true, data: contrato })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear contrato' })
  }
})

// Actualizar contrato
router.put('/:id', validate(contratoUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const contrato = await prisma.contrato.update({
      where: { id: parseInt(id) },
      data: req.body,
      include: { proveedor: true }
    })
    res.json({ success: true, data: contrato })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar contrato' })
  }
})

// Eliminar contrato
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.contrato.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Contrato eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar contrato' })
  }
})

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), async (req, res) => {
  try {
    const { ids } = req.body
    const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    await prisma.contrato.deleteMany({ where: { id: { in: numericIds } } })
    res.json({ success: true, message: `${numericIds.length} contratos eliminados` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error en eliminación masiva' })
  }
})

// Renovar contrato (crea uno nuevo basado en el anterior)
router.post('/:id/renovar', async (req, res) => {
  try {
    const { id } = req.params
    const { fechaInicio, fechaFin, monto, observaciones } = req.body
    
    const contratoOriginal = await prisma.contrato.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (!contratoOriginal) {
      return res.status(404).json({ success: false, message: 'Contrato no encontrado' })
    }

    // Crear nuevo contrato como renovación
    const nuevoContrato = await prisma.contrato.create({
      data: {
        proveedorId: contratoOriginal.proveedorId,
        tipo: contratoOriginal.tipo,
        numero: contratoOriginal.numero ? `${contratoOriginal.numero}-R` : null,
        objeto: contratoOriginal.objeto,
        monto: monto || contratoOriginal.monto,
        moneda: contratoOriginal.moneda,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        estado: 'Activo',
        observaciones: observaciones || `Renovación del contrato #${contratoOriginal.id}`,
        diasAviso: contratoOriginal.diasAviso
      },
      include: { proveedor: true }
    })

    // Actualizar contrato original a estado renovado
    await prisma.contrato.update({
      where: { id: parseInt(id) },
      data: { estado: 'Renovado' }
    })

    res.status(201).json({ success: true, data: nuevoContrato })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al renovar contrato' })
  }
})

export default router

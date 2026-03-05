import { Router } from 'express'
import { prisma } from '../../prisma'
import { authMiddleware, requireAdmin } from '../../middleware/auth'
import { createAuditLog, getRequestInfo } from '../../services/auditLogService'
import { validate, costoSchema, costoUpdateSchema } from '../../validations/index'

const router = Router()

// ============================================
// COSTOS CLOUD
// ============================================

// Obtener todos los costos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { proveedor, cuenta, servicio, mes, anio } = req.query
    
    let where: any = {}
    
    if (proveedor) where.proveedor = proveedor as string
    if (cuenta) where.cuenta = cuenta as string
    if (servicio) where.servicio = servicio as string
    if (mes) where.mes = mes as string
    if (anio) where.mes = { contains: anio as string }
    
    const costos = await prisma.costoCloud.findMany({
      where,
      orderBy: { mes: 'desc' }
    })
    
    res.json({ success: true, data: costos })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener costos' })
  }
})

// Obtener estadísticas de costos
router.get('/estadisticas', authMiddleware, async (req, res) => {
  try {
    const [total, proveedores, servicios, cuentas] = await Promise.all([
      prisma.costoCloud.aggregate({ _sum: { monto: true } }),
      prisma.costoCloud.groupBy({ by: ['proveedor'], _count: { id: true } }),
      prisma.costoCloud.groupBy({ by: ['servicio'], _count: { id: true } }),
      prisma.costoCloud.groupBy({ by: ['cuenta'], _count: { id: true } })
    ])
    
    res.json({ 
      success: true, 
      data: { 
        total: total._sum.monto || 0,
        proveedores: proveedores.length,
        servicios: servicios.length,
        cuentas: cuentas.length
      } 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
  }
})

// Obtener estadísticas/resumen de costos
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const { anio } = req.query
    
    // Costos por proveedor
    const porProveedor = await prisma.costoCloud.groupBy({
      by: ['proveedor'],
      _sum: { monto: true },
      _count: { id: true }
    })
    
    // Costos por servicio
    const porServicio = await prisma.costoCloud.groupBy({
      by: ['servicio'],
      _sum: { monto: true },
      _count: { id: true }
    })
    
    // Costos por cuenta
    const porCuenta = await prisma.costoCloud.groupBy({
      by: ['cuenta'],
      _sum: { monto: true },
      _count: { id: true }
    })
    
    // Total general
    const total = await prisma.costoCloud.aggregate({
      _sum: { monto: true }
    })
    
    // Por mes (últimos 12 meses)
    const ultimos12Meses: any = []
    for (let i = 0; i < 12; i++) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - i)
      const mesStr = fecha.toISOString().slice(0, 7)
      
      const resultado = await prisma.costoCloud.aggregate({
        _sum: { monto: true },
        where: { mes: mesStr }
      })
      
      ultimos12Meses.push({
        mes: mesStr,
        monto: resultado._sum.monto || 0
      })
    }
    
    res.json({ 
      success: true, 
      data: { 
        total: total._sum.monto || 0,
        porProveedor,
        porServicio,
        porCuenta,
        ultimos12Meses: ultimos12Meses.reverse()
      } 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener resumen' })
  }
})

// Obtener costos por mes específico
router.get('/mes/:mes', authMiddleware, async (req, res) => {
  try {
    const { mes } = req.params
    
    const costos = await prisma.costoCloud.findMany({
      where: { mes },
      orderBy: { monto: 'desc' }
    })
    
    const total = await prisma.costoCloud.aggregate({
      _sum: { monto: true },
      where: { mes }
    })
    
    res.json({ 
      success: true, 
      data: { 
        costos, 
        total: total._sum.monto || 0,
        mes 
      } 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener costos del mes' })
  }
})

// Agregar costo manualmente
router.post('/', authMiddleware, requireAdmin, validate(costoSchema), async (req, res) => {
  try {
    const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = req.body
    
    // Verificar si ya existe
    const existente = await prisma.costoCloud.findFirst({
      where: { proveedor, cuenta, servicio, region: region || null, mes }
    })
    
    if (existente) {
      // Actualizar monto
      const costo = await prisma.costoCloud.update({
        where: { id: existente.id },
        data: {
          monto: existente.monto + monto
        }
      })
      
      return res.json({ success: true, data: costo, message: 'Costo actualizado' })
    }
    
    const costo = await prisma.costoCloud.create({
      data: {
        proveedor,
        cuenta,
        servicio,
        region,
        mes,
        moneda: moneda || 'USD',
        monto,
        etiquetas: etiquetas ? JSON.stringify(etiquetas) : null
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'create',
      entidad: 'CostoCloud',
      entidadId: costo.id,
      datosNuevos: { proveedor, servicio, mes, monto },
      ...getRequestInfo(req)
    })
    
    res.status(201).json({ success: true, data: costo })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al agregar costo' })
  }
})

// Importar costos (bulk)
router.post('/importar', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { costos } = req.body  // Array de objetos de costos
    
    if (!Array.isArray(costos) || costos.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de costos' })
    }
    
    const resultados = []
    
    for (const costo of costos) {
      const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = costo
      
      const existente = await prisma.costoCloud.findFirst({
        where: { proveedor, cuenta, servicio, region: region || null, mes }
      })
      
      if (existente) {
        await prisma.costoCloud.update({
          where: { id: existente.id },
          data: { monto: existente.monto + monto }
        })
        resultados.push({ ...costo, accion: 'actualizado' })
      } else {
        await prisma.costoCloud.create({
          data: {
            proveedor,
            cuenta,
            servicio,
            region,
            mes,
            moneda: moneda || 'USD',
            monto,
            etiquetas: etiquetas ? JSON.stringify(etiquetas) : null
          }
        })
        resultados.push({ ...costo, accion: 'creado' })
      }
    }
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'import',
      entidad: 'CostoCloud',
      datosNuevos: { cantidad: costos.length },
      ...getRequestInfo(req)
    })
    
    res.json({ 
      success: true, 
      message: `${resultados.length} costos importados`,
      data: resultados 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al importar costos' })
  }
})

// Actualizar costo
router.put('/:id', authMiddleware, requireAdmin, validate(costoUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = req.body
    
    const costo = await prisma.costoCloud.update({
      where: { id: parseInt(id) },
      data: {
        proveedor,
        cuenta,
        servicio,
        region,
        mes,
        moneda,
        monto,
        etiquetas: etiquetas ? JSON.stringify(etiquetas) : undefined
      }
    })
    
    res.json({ success: true, data: costo })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar costo' })
  }
})

// Eliminar costo
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await prisma.costoCloud.delete({
      where: { id: parseInt(id) }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'delete',
      entidad: 'CostoCloud',
      entidadId: parseInt(id),
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, message: 'Costo eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar costo' })
  }
})

export default router

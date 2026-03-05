import { Router } from 'express'
import { prisma } from '../../prisma'
import { authMiddleware, requireAdmin } from '../../middleware/auth'
import { createAuditLog, getRequestInfo } from '../../services/auditLogService'

const router = Router()

// ============================================
// CERTIFICADOS SSL
// ============================================

// Obtener todos los certificados
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { vencidos, porVencer } = req.query
    
    let where: any = { activo: true }
    
    if (vencidos === 'true') {
      where.fechaVencimiento = { lt: new Date() }
    }
    
    if (porVencer === 'true') {
      const fechaLimite = new Date()
      fechaLimite.setDate(fechaLimite.getDate() + 30)
      where.fechaVencimiento = {
        gte: new Date(),
        lte: fechaLimite
      }
    }
    
    const certificados = await prisma.certificadoSSL.findMany({
      where,
      include: {
        proveedor: true,
        servidor: { select: { id: true, host: true, ip: true } }
      },
      orderBy: { fechaVencimiento: 'asc' }
    })
    
    res.json({ success: true, data: certificados })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener certificados' })
  }
})

// Obtener estadísticas de certificados
router.get('/estadisticas', authMiddleware, async (req, res) => {
  try {
    const ahora = new Date()
    const proximoMes = new Date()
    proximoMes.setDate(proximoMes.getDate() + 30)
    
    const [total, vencidos, porVencer, activos] = await Promise.all([
      prisma.certificadoSSL.count({ where: { activo: true } }),
      prisma.certificadoSSL.count({ 
        where: { activo: true, fechaVencimiento: { lt: ahora } } 
      }),
      prisma.certificadoSSL.count({ 
        where: { 
          activo: true, 
          fechaVencimiento: { gte: ahora, lte: proximoMes } 
        } 
      }),
      prisma.certificadoSSL.count({ 
        where: { activo: true, fechaVencimiento: { gt: proximoMes } } 
      })
    ])
    
    // Por emisor
    const porEmisor = await prisma.certificadoSSL.groupBy({
      by: ['emisor'],
      _count: { id: true },
      where: { activo: true, emisor: { not: null } }
    })
    
    res.json({ 
      success: true, 
      data: { total, vencidos, porVencer, activos, porEmisor } 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
  }
})

// Obtener certificado por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const certificado = await prisma.certificadoSSL.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        proveedor: true,
        servidor: true
      }
    })
    
    if (!certificado) {
      return res.status(404).json({ success: false, message: 'Certificado no encontrado' })
    }
    
    res.json({ success: true, data: certificado })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener certificado' })
  }
})

// Crear certificado
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { dominio, tipo, emisor, fechaEmision, fechaVencimiento, proveedorId, servidorId, notas } = req.body
    
    const certificado = await prisma.certificadoSSL.create({
      data: {
        dominio,
        tipo: tipo || 'single',
        emisor,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaVencimiento: new Date(fechaVencimiento),
        proveedorId: proveedorId ? parseInt(proveedorId) : null,
        servidorId: servidorId ? parseInt(servidorId) : null,
        notas
      }
    })
    
    // Audit log
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'create',
      entidad: 'CertificadoSSL',
      entidadId: certificado.id,
      datosNuevos: { dominio },
      ...getRequestInfo(req)
    })
    
    res.status(201).json({ success: true, data: certificado })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear certificado' })
  }
})

// Actualizar certificado
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { dominio, tipo, emisor, fechaEmision, fechaVencimiento, proveedorId, servidorId, notas, activo } = req.body
    
    const certificado = await prisma.certificadoSSL.update({
      where: { id: parseInt(id) },
      data: {
        dominio,
        tipo,
        emisor,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : undefined,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        proveedorId: proveedorId ? parseInt(proveedorId) : undefined,
        servidorId: servidorId ? parseInt(servidorId) : undefined,
        notas,
        activo
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'update',
      entidad: 'CertificadoSSL',
      entidadId: certificado.id,
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, data: certificado })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar certificado' })
  }
})

// Eliminar certificado
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    
    await prisma.certificadoSSL.delete({
      where: { id: parseInt(id) }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'delete',
      entidad: 'CertificadoSSL',
      entidadId: parseInt(id),
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, message: 'Certificado eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar certificado' })
  }
})

export default router

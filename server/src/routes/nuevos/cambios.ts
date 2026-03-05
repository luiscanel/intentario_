import { Router } from 'express'
import { prisma } from '../../prisma'
import { authMiddleware, requireAdmin } from '../../middleware/auth'
import { createAuditLog, getRequestInfo } from '../../services/auditLogService'
import { validate, cambioSchema, cambioUpdateSchema } from '../../validations/index'

const router = Router()

// ============================================
// GESTIÓN DE CAMBIOS
// ============================================

// Obtener todos los cambios
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { estado, tipo, prioridad, buscar } = req.query
    
    let where: any = {}
    
    if (estado) where.estado = estado as string
    if (tipo) where.tipo = tipo as string
    if (prioridad) where.prioridad = prioridad as string
    if (buscar) {
      where.OR = [
        { titulo: { contains: buscar as string } },
        { descripcion: { contains: buscar as string } }
      ]
    }
    
    const cambios = await prisma.cambio.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ success: true, data: cambios })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener cambios' })
  }
})

// Obtener estadísticas de cambios
router.get('/estadisticas', authMiddleware, async (req, res) => {
  try {
    const [total, pendientes, aprobados, rechazados, completados] = await Promise.all([
      prisma.cambio.count(),
      prisma.cambio.count({ where: { estado: 'pendiente' } }),
      prisma.cambio.count({ where: { estado: 'aprobado' } }),
      prisma.cambio.count({ where: { estado: 'rechazado' } }),
      prisma.cambio.count({ where: { estado: 'completado' } })
    ])
    
    // Por prioridad
    const porPrioridad = await prisma.cambio.groupBy({
      by: ['prioridad'],
      _count: { id: true }
    })
    
    // Por tipo
    const porTipo = await prisma.cambio.groupBy({
      by: ['tipo'],
      _count: { id: true }
    })
    
    res.json({ 
      success: true, 
      data: { total, pendientes, aprobados, rechazados, completados, porPrioridad, porTipo } 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
  }
})

// Obtener cambio por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cambio = await prisma.cambio.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        logs: { orderBy: { createdAt: 'asc' } }
      }
    })
    
    if (!cambio) {
      return res.status(404).json({ success: false, message: 'Cambio no encontrado' })
    }
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener cambio' })
  }
})

// Crear cambio
router.post('/', authMiddleware, validate(cambioSchema), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, prioridad, solicitante, planRollback, serviciosAfectados, downtimeEstimado, notas } = req.body
    
    const cambio = await prisma.cambio.create({
      data: {
        titulo,
        descripcion,
        tipo: tipo || 'normal',
        prioridad: prioridad || 'media',
        solicitante: solicitante || (req as any).user?.email,
        estado: 'pendiente',
        planRollback,
        serviciosAfectados: serviciosAfectados ? JSON.stringify(serviciosAfectados) : null,
        downtimeEstimado,
        notas
      }
    })
    
    // Crear log inicial
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'created',
        detalles: JSON.stringify({ titulo, tipo, prioridad })
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'create',
      entidad: 'Cambio',
      entidadId: cambio.id,
      datosNuevos: { titulo },
      ...getRequestInfo(req)
    })
    
    res.status(201).json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear cambio' })
  }
})

// Aprobar cambio
router.post('/:id/aprobar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { comentarios } = req.body
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'aprobado',
        aprobador: (req as any).user?.email,
        fechaAprobacion: new Date(),
        comentariosAprobacion: comentarios
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'approved',
        detalles: comentarios ? JSON.stringify({ comentarios }) : null
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'update',
      entidad: 'Cambio',
      entidadId: cambio.id,
      datosNuevos: { estado: 'aprobado' },
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al aprobar cambio' })
  }
})

// Rechazar cambio
router.post('/:id/rechazar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { comentarios } = req.body
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'rechazado',
        aprobador: (req as any).user?.email,
        fechaAprobacion: new Date(),
        comentariosAprobacion: comentarios
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'rejected',
        detalles: comentarios ? JSON.stringify({ comentarios }) : null
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'update',
      entidad: 'Cambio',
      entidadId: cambio.id,
      datosNuevos: { estado: 'rechazado' },
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al rechazar cambio' })
  }
})

// Iniciar cambio aprobado
router.post('/:id/iniciar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { responsable } = req.body
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'en_progreso',
        fechaInicio: new Date(),
        responsableEjecucion: responsable || (req as any).user?.email
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'started',
        detalles: JSON.stringify({ responsable: cambio.responsableEjecucion })
      }
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al iniciar cambio' })
  }
})

// Completar cambio
router.post('/:id/completar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { downtimeReal, notas } = req.body
    
    const cambioExistente = await prisma.cambio.findUnique({ where: { id: parseInt(id) } })
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'completado',
        fechaFin: new Date(),
        downtimeReal,
        notas: notas || cambioExistente?.notas
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'completed',
        detalles: JSON.stringify({ downtimeReal })
      }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'update',
      entidad: 'Cambio',
      entidadId: cambio.id,
      datosNuevos: { estado: 'completado' },
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al completar cambio' })
  }
})

// Cancelar cambio
router.post('/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { motivo } = req.body
    
    const cambioExistente = await prisma.cambio.findUnique({ where: { id: parseInt(id) } })
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'cancelado',
        notas: cambioExistente?.notas ? `${cambioExistente.notas}\n\nCancelado: ${motivo}` : `Cancelado: ${motivo}`
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'cancelled',
        detalles: JSON.stringify({ motivo })
      }
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al cancelar cambio' })
  }
})

// Actualizar cambio
router.put('/:id', authMiddleware, validate(cambioUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const { titulo, descripcion, tipo, prioridad, planRollback, serviciosAfectados, downtimeEstimado, notas } = req.body
    
    const cambio = await prisma.cambio.update({
      where: { id: parseInt(id) },
      data: {
        titulo,
        descripcion,
        tipo,
        prioridad,
        planRollback,
        serviciosAfectados: serviciosAfectados ? JSON.stringify(serviciosAfectados) : undefined,
        downtimeEstimado,
        notas
      }
    })
    
    await prisma.cambioLog.create({
      data: {
        cambioId: cambio.id,
        usuario: (req as any).user?.email,
        accion: 'updated',
        detalles: JSON.stringify({ campos: Object.keys(req.body) })
      }
    })
    
    res.json({ success: true, data: cambio })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar cambio' })
  }
})

// Eliminar cambio
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    await prisma.cambio.delete({
      where: { id: parseInt(id) }
    })
    
    createAuditLog({
      usuarioId: (req as any).user?.id,
      usuario: (req as any).user?.email,
      accion: 'delete',
      entidad: 'Cambio',
      entidadId: parseInt(id),
      ...getRequestInfo(req)
    })
    
    res.json({ success: true, message: 'Cambio eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar cambio' })
  }
})

export default router

import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// Obtener todas las alertas
router.get('/', async (req, res) => {
  try {
    const alertas = await prisma.alerta.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: alertas })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener alertas' })
  }
})

// Obtener alertas no leídas
router.get('/no-leidas', async (req, res) => {
  try {
    const alertas = await prisma.alerta.findMany({
      where: { leida: false },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: alertas })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener alertas' })
  }
})

// Contar alertas no leídas
router.get('/contador', async (req, res) => {
  try {
    const count = await prisma.alerta.count({
      where: { leida: false }
    })
    res.json({ success: true, count })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al contar alertas' })
  }
})

// Crear alerta
router.post('/', async (req, res) => {
  try {
    const { tipo, titulo, mensaje, entidad, entidadId } = req.body
    const alerta = await prisma.alerta.create({
      data: { tipo, titulo, mensaje, entidad, entidadId }
    })
    res.status(201).json({ success: true, data: alerta })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear alerta' })
  }
})

// Marcar alerta como leída
router.put('/:id/leer', async (req, res) => {
  try {
    const { id } = req.params
    const userEmail = (req as any).user?.email
    const alerta = await prisma.alerta.update({
      where: { id: parseInt(id) },
      data: { leida: true, leidaPor: userEmail, leidaAt: new Date() }
    })
    res.json({ success: true, data: alerta })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al marcar alerta' })
  }
})

// Marcar todas como leídas
router.put('/marcar-todas-leidas', async (req, res) => {
  try {
    const userEmail = (req as any).user?.email
    await prisma.alerta.updateMany({
      where: { leida: false },
      data: { leida: true, leidaPor: userEmail, leidaAt: new Date() }
    })
    res.json({ success: true, message: 'Todas las alertas marcadas como leídas' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al marcar alertas' })
  }
})

// Eliminar alerta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.alerta.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Alerta eliminada' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar alerta' })
  }
})

// Eliminar todas las leídas
router.delete('/limpiar/leidas', async (req, res) => {
  try {
    const result = await prisma.alerta.deleteMany({
      where: { leida: true }
    })
    res.json({ success: true, message: `${result.count} alertas eliminadas` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al limpiar alertas' })
  }
})

export default router

import { Router } from 'express'
import { prisma } from '../prisma/index.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/config-alertas', authMiddleware, async (req, res) => {
  try {
    const configs = await prisma.configAlerta.findMany({ orderBy: { tipo: 'asc' } })
    res.json({ success: true, data: configs })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' })
  }
})

router.put('/config-alertas/:tipo', authMiddleware, async (req, res) => {
  try {
    const { tipo } = req.params
    const { nombre, diasAntelacion, activo, enviarEmail, crearAlerta, emailDestino } = req.body
    
    const config = await prisma.configAlerta.update({
      where: { tipo },
      data: {
        ...(nombre && { nombre }),
        ...(diasAntelacion !== undefined && { diasAntelacion }),
        ...(activo !== undefined && { activo }),
        ...(enviarEmail !== undefined && { enviarEmail }),
        ...(crearAlerta !== undefined && { crearAlerta }),
        ...(emailDestino !== undefined && { emailDestino })
      }
    })
    
    res.json({ success: true, data: config, message: 'Configuración actualizada' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' })
  }
})

router.post('/ejecutar-verificacion', authMiddleware, async (req, res) => {
  try {
    const { runScheduledChecks, checkAllMonitoredServices } = await import('../services/notificacionesService.js')
    await runScheduledChecks()
    await checkAllMonitoredServices()
    res.json({ success: true, message: 'Verificación ejecutada' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al ejecutar verificación' })
  }
})

export default router

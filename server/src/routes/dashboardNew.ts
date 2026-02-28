import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { 
  getSecurityStats, 
  getResourcesStats, 
  getAvailabilityStats,
  getPhysicalStats,
  getResponsablesStats,
  getCloudStats
} from '../services/dashboardService'

const router = Router()

router.use(authMiddleware)

router.get('/security', async (req, res) => {
  try {
    const stats = await getSecurityStats()
    res.json(stats)
  } catch (error) {
    console.error('Error security stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de seguridad' })
  }
})

router.get('/resources', async (req, res) => {
  try {
    const stats = await getResourcesStats()
    res.json(stats)
  } catch (error) {
    console.error('Error resources stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de recursos' })
  }
})

router.get('/availability', async (req, res) => {
  try {
    const stats = await getAvailabilityStats()
    res.json(stats)
  } catch (error) {
    console.error('Error availability stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de disponibilidad' })
  }
})

router.get('/physical', async (req, res) => {
  try {
    const stats = await getPhysicalStats()
    res.json(stats)
  } catch (error) {
    console.error('Error physical stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de inventario físico' })
  }
})

router.get('/responsables', async (req, res) => {
  try {
    const stats = await getResponsablesStats()
    res.json(stats)
  } catch (error) {
    console.error('Error responsables stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de responsables' })
  }
})

router.get('/cloud', async (req, res) => {
  try {
    const stats = await getCloudStats()
    res.json(stats)
  } catch (error) {
    console.error('Error cloud stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de cloud' })
  }
})

export default router

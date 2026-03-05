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
import { cacheMiddleware, invalidateCache } from '../services/cacheService'

const router = Router()

router.use(authMiddleware)

// Cache de 5 minutos para dashboards (se puede ajustar)
const dashboardCache = cacheMiddleware(5 * 60 * 1000)

router.get('/security', dashboardCache, async (req, res) => {
  try {
    const stats = await getSecurityStats()
    res.json(stats)
  } catch (error) {
    console.error('Error security stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de seguridad' })
  }
})

router.get('/resources', dashboardCache, async (req, res) => {
  try {
    const stats = await getResourcesStats()
    res.json(stats)
  } catch (error) {
    console.error('Error resources stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de recursos' })
  }
})

router.get('/availability', dashboardCache, async (req, res) => {
  try {
    const stats = await getAvailabilityStats()
    res.json(stats)
  } catch (error) {
    console.error('Error availability stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de disponibilidad' })
  }
})

router.get('/physical', dashboardCache, async (req, res) => {
  try {
    const stats = await getPhysicalStats()
    res.json(stats)
  } catch (error) {
    console.error('Error physical stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de inventario físico' })
  }
})

router.get('/responsables', dashboardCache, async (req, res) => {
  try {
    const stats = await getResponsablesStats()
    res.json(stats)
  } catch (error) {
    console.error('Error responsables stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de responsables' })
  }
})

router.get('/cloud', dashboardCache, async (req, res) => {
  try {
    const stats = await getCloudStats()
    res.json(stats)
  } catch (error) {
    console.error('Error cloud stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas de cloud' })
  }
})

// Endpoint para invalidar cache (usado cuando hay cambios en datos)
router.post('/refresh', async (req, res) => {
  try {
    invalidateCache('/api/dashboard')
    res.json({ success: true, message: 'Cache de dashboards invalidado' })
  } catch (error) {
    console.error('Error invalidating cache:', error)
    res.status(500).json({ message: 'Error al invalidar cache' })
  }
})

export default router

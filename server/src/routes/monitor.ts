import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const router = Router()

router.use(authMiddleware)

// Función para hacer ping
async function pingHost(ip: string): Promise<{ status: string; latency: number | null }> {
  try {
    const platform = process.platform
    let command: string
    
    if (platform === 'win32') {
      command = `ping -n 1 -w 1000 ${ip}`
    } else {
      command = `ping -c 1 -W 1 ${ip}`
    }
    
    const { stdout } = await execAsync(command, { timeout: 5000 })
    
    // Extraer latencia
    let latency: number | null = null
    if (platform === 'win32') {
      const match = stdout.match(/time[=<](\d+)ms/i)
      if (match) latency = parseInt(match[1])
    } else {
      const match = stdout.match(/time=(\d+\.?\d*)\s*ms/i)
      if (match) latency = parseInt(match[1])
    }
    
    return { status: 'online', latency }
  } catch (error) {
    return { status: 'offline', latency: null }
  }
}

// Obtener disponibilidad por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const disponibilidad = await prisma.disponibilidad.findUnique({
      where: { id: parseInt(id) }
    })
    if (!disponibilidad) {
      return res.status(404).json({ success: false, message: 'Monitor no encontrado' })
    }
    res.json({ success: true, data: disponibilidad })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener monitor' })
  }
})

// Obtener estado de todos los servidores monitoreados
router.get('/', async (req, res) => {
  try {
    const Disponibilidades = await prisma.disponibilidad.findMany({
      orderBy: { ultimoCheck: 'desc' }
    })
    res.json({ success: true, data: Disponibilidades })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' })
  }
})

// Obtener servidores del inventario que no están siendo monitoreados
router.get('/disponibles', async (req, res) => {
  try {
    const servidores = await prisma.servidor.findMany({
      select: { id: true, host: true, ip: true, nombreVM: true }
    })
    
    const monitoreados = await prisma.disponibilidad.findMany({
      select: { ip: true }
    })
    const ipsMonitoreadas = new Set(monitoreados.map(d => d.ip))
    
    const disponibles = servidores.filter(s => s.ip && !ipsMonitoreadas.has(s.ip))
    res.json({ success: true, data: disponibles })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener servidores disponibles' })
  }
})

// Agregar servidor al monitoreo
router.post('/', async (req, res) => {
  try {
    const { servidorId, ip, nombre } = req.body
    
    if (!ip) {
      return res.status(400).json({ success: false, message: 'IP requerida' })
    }
    
    // Verificar si ya existe
    const existente = await prisma.disponibilidad.findFirst({
      where: { ip }
    })
    
    if (existente) {
      return res.status(400).json({ success: false, message: 'IP ya está siendo monitoreada' })
    }
    
    const disponibilidad = await prisma.disponibilidad.create({
      data: {
        servidorId: servidorId || null,
        ip,
        nombre: nombre || ip,
        status: 'unknown',
        ultimoCheck: new Date()
      }
    })
    
    res.status(201).json({ success: true, data: disponibilidad })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al agregar al monitoreo' })
  }
})

// Hacer ping a una IP específica
router.post('/ping/:ip', async (req, res) => {
  try {
    const { ip } = req.params
    const result = await pingHost(ip)
    
    // Guardar en historial
    await prisma.historialDisponibilidad.create({
      data: {
        ip,
        status: result.status,
        latency: result.latency
      }
    })
    
    res.json({ success: true, ip, ...result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al hacer ping' })
  }
})

// Hacer ping a todos los servidores monitoreados
router.post('/ping-all', async (req, res) => {
  try {
    const Disponibilidades = await prisma.disponibilidad.findMany()
    const results = []
    
    for (const disp of Disponibilidades) {
      const result = await pingHost(disp.ip)
      
      // Actualizar estado
      await prisma.disponibilidad.update({
        where: { id: disp.id },
        data: {
          status: result.status,
          latency: result.latency,
          ultimoCheck: new Date()
        }
      })
      
      // Guardar en historial
      await prisma.historialDisponibilidad.create({
        data: {
          ip: disp.ip,
          status: result.status,
          latency: result.latency
        }
      })
      
      results.push({ ip: disp.ip, ...result })
    }
    
    // Contar resultados
    const online = results.filter(r => r.status === 'online').length
    const offline = results.filter(r => r.status === 'offline').length
    
    res.json({ 
      success: true, 
      total: results.length, 
      online, 
      offline,
      results 
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al hacer ping a todos' })
  }
})

// Actualizar monitor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, tipo, puerto, activo } = req.body
    
    const disponibilidad = await prisma.disponibilidad.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre ?? undefined,
        tipo: tipo ?? undefined,
        puerto: puerto ?? undefined,
        activo: activo ?? undefined
      }
    })
    res.json({ success: true, data: disponibilidad })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar monitor' })
  }
})

// Eliminar del monitoreo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.disponibilidad.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Eliminado del monitoreo' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar' })
  }
})

// Obtener historial de disponibilidad
router.get('/historial/:ip', async (req, res) => {
  try {
    const { ip } = req.params
    const historial = await prisma.historialDisponibilidad.findMany({
      where: { ip },
      orderBy: { checkTime: 'desc' },
      take: 100
    })
    res.json({ success: true, data: historial })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener historial' })
  }
})

export default router

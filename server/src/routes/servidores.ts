import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, servidorSchema, servidorUpdateSchema, servidorImportSchema, bulkDeleteSchema } from '../validations/index.js'
import { createAuditLog, getRequestInfo } from '../services/auditLogService.js'

const router = Router()

router.use(authMiddleware)

// Obtener todos los servidores
router.get('/', async (req, res) => {
  try {
    const servidores = await prisma.servidor.findMany({
      orderBy: { id: 'desc' }
    })
    res.json({ success: true, data: servidores })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener servidores',
      code: 'FETCH_ERROR'
    })
  }
})

// Crear servidor
router.post('/', validate(servidorSchema), async (req, res) => {
  try {
    const servidor = await prisma.servidor.create({
      data: req.body
    })
    res.status(201).json({ success: true, data: servidor })

    // Audit log
    const userId = (req as any).user?.id
    const userEmail = (req as any).user?.email
    createAuditLog({
      usuarioId: userId,
      usuario: userEmail,
      accion: 'create',
      entidad: 'Servidor',
      entidadId: servidor.id,
      datosNuevos: req.body,
      ...getRequestInfo(req)
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear servidor',
      code: 'CREATE_ERROR'
    })
  }
})

// Actualizar servidor
router.put('/:id', validate(servidorUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params
    const servidor = await prisma.servidor.update({
      where: { id: parseInt(id) },
      data: req.body
    })
    res.json({ success: true, data: servidor })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar servidor',
      code: 'UPDATE_ERROR'
    })
  }
})

// Eliminar servidor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = parseInt(id)
    
    // Obtener datos antes de eliminar
    const servidorPrev = await prisma.servidor.findUnique({ where: { id: idNum } })
    
    await prisma.servidor.delete({
      where: { id: idNum }
    })

    // Audit log
    const userId = (req as any).user?.id
    const userEmail = (req as any).user?.email
    createAuditLog({
      usuarioId: userId,
      usuario: userEmail,
      accion: 'delete',
      entidad: 'Servidor',
      entidadId: idNum,
      datosPrevios: servidorPrev,
      ...getRequestInfo(req)
    })
    res.json({ success: true, message: 'Servidor eliminado' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar servidor',
      code: 'DELETE_ERROR'
    })
  }
})

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), async (req, res) => {
  try {
    const { ids } = req.body
    
    // Convertir strings a números
    const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
    
    await prisma.servidor.deleteMany({
      where: { id: { in: numericIds } }
    })
    res.json({ success: true, message: `${numericIds.length} servidores eliminados` })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error en eliminación masiva',
      code: 'BULK_DELETE_ERROR'
    })
  }
})

// Importar servidores
router.post('/import', validate(servidorImportSchema), async (req, res) => {
  try {
    const { servidores } = req.body

    const str = (v: any) => {
      if (v === null || v === undefined) return ''
      const trimmed = String(v).trim()
      return trimmed || ''
    }

    const dataToInsert = servidores.map((s: any) => {
      const server = s as any
      
      // Handle case variations
      const nombreVM = server.nombreVM || server.nombreVm || server.nombrevm || ''
      const version = server.version || server.versionOs || server.versionos || ''

      const parseNumber = (v: any): string => {
        if (v === null || v === undefined) return '0'
        const num = parseFloat(String(v).replace(/[^0-9.]/g, ''))
        if (isNaN(num)) return '0'
        return Math.round(num).toString()
      }

      return {
        pais: str(server.pais) || 'Colombia',
        host: str(server.host) || '',
        nombreVM: str(nombreVM),
        ip: str(server.ip),
        cpu: parseInt(String(server.cpu)) || 0,
        memoria: parseNumber(server.memoria),
        disco: parseNumber(server.disco),
        ambiente: str(server.ambiente) || 'Produccion',
        arquitectura: str(server.arquitectura) || 'x86_64',
        sistemaOperativo: str(server.sistemaOperativo),
        version: str(version),
        antivirus: str(server.antivirus),
        estado: str(server.estado) || 'Activo',
        responsable: str(server.responsable)
      }
    })

    // Filtrar registros con IP válida
    const validData = dataToInsert.filter((s: any) => s.ip)
    
    if (validData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No hay servidores con IP válida para importar',
        code: 'NO_VALID_SERVERS'
      })
    }

    // Obtener IPs existentes
    const existingServers = await prisma.servidor.findMany({
      where: { ip: { in: validData.map((s: any) => s.ip!) } },
      select: { ip: true }
    })
    const existingIPs = new Set(existingServers.map(s => s.ip))

    // Filtrar duplicados
    const newData = validData.filter((s: any) => !existingIPs.has(s.ip!))

    if (newData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los servidores ya existen en la base de datos',
        code: 'ALL_DUPLICATES'
      })
    }

    let created = 0
    let skipped = 0

    for (const server of newData) {
      try {
        await prisma.servidor.create({ data: server })
        created++
      } catch (e: any) {
        skipped++
      }
    }

    res.json({ 
      success: true, 
      message: `${created} servidores importados correctamente`, 
      count: created, 
      skipped 
    })
  } catch (error: any) {
    console.error('Error importing:', error)
    res.status(500).json({ 
      success: false, 
      message: `Error al importar servidores: ${error.message}`,
      code: 'IMPORT_ERROR'
    })
  }
})

export default router

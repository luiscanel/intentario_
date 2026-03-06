import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { validate, servidorSchema, servidorUpdateSchema, servidorImportSchema, bulkDeleteSchema } from '../validations/index.js'
import { createAuditLog, getRequestInfo } from '../services/auditLogService.js'
import { asyncHandler, success, notFound, serverError, withPagination } from '../utils/apiResponse.js'

const router = Router()

router.use(authMiddleware)

// Obtener servidor por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const servidor = await prisma.servidor.findUnique({
    where: { id: parseInt(id) }
  })
  
  if (!servidor) {
    return res.status(404).json(notFound('Servidor no encontrado'))
  }
  
  res.json(success(servidor))
}))

// Obtener todos los servidores (con paginación y filtros)
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = '1', 
    limit = '50', 
    search = '',
    pais,
    ambiente,
    estado,
    sortBy = 'id',
    sortOrder = 'desc'
  } = req.query

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  
  if (search) {
    where.OR = [
      { nombreVM: { contains: search as string } },
      { ip: { contains: search as string } },
      { host: { contains: search as string } },
      { responsable: { contains: search as string } },
    ]
  }
  if (pais) where.pais = pais
  if (ambiente) where.ambiente = ambiente
  if (estado) where.estado = estado

  const [servidores, total] = await Promise.all([
    prisma.servidor.findMany({
      where,
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: limitNum
    }),
    prisma.servidor.count({ where })
  ])

  res.json(withPagination(servidores, pageNum, limitNum, total))
}))

// Búsqueda avanzada
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '' } = req.query
  
  if (!q || (q as string).length < 2) {
    return res.json(success([]))
  }

  const servidores = await prisma.servidor.findMany({
    where: {
      OR: [
        { nombreVM: { contains: q as string } },
        { ip: { contains: q as string } },
        { host: { contains: q as string } },
        { responsable: { contains: q as string } },
        { sistemaOperativo: { contains: q as string } },
      ]
    },
    take: 20,
    orderBy: { nombreVM: 'asc' }
  })

  res.json(success(servidores))
}))

// Crear servidor
router.post('/', validate(servidorSchema), asyncHandler(async (req, res) => {
  const servidor = await prisma.servidor.create({
    data: req.body
  })

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

  res.status(201).json(success(servidor, 'Servidor creado correctamente'))
}))

// Actualizar servidor
router.put('/:id', validate(servidorUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params
  const servidor = await prisma.servidor.update({
    where: { id: parseInt(id) },
    data: req.body
  })
  res.json(success(servidor, 'Servidor actualizado correctamente'))
}))

// Eliminar servidor
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const idNum = parseInt(id)
  
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
  
  res.json(success(null, 'Servidor eliminado correctamente'))
}))

// Eliminación masiva
router.post('/bulk-delete', validate(bulkDeleteSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body
  
  const numericIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
  
  await prisma.servidor.deleteMany({
    where: { id: { in: numericIds } }
  })
  
  res.json(success(null, `${numericIds.length} servidores eliminados`))
}))

// Importar servidores
router.post('/import', validate(servidorImportSchema), asyncHandler(async (req, res) => {
  const { servidores } = req.body

  const str = (v: any) => {
    if (v === null || v === undefined) return ''
    const trimmed = String(v).trim()
    return trimmed || ''
  }

  const dataToInsert = servidores.map((s: any) => {
    const server = s as any
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

  const validData = dataToInsert.filter((s: any) => s.ip)
  
  if (validData.length === 0) {
    return res.status(400).json(serverError('No hay servidores con IP válida para importar', 'NO_VALID_SERVERS'))
  }

  const existingServers = await prisma.servidor.findMany({
    where: { ip: { in: validData.map((s: any) => s.ip!) } },
    select: { ip: true }
  })
  const existingIPs = new Set(existingServers.map(s => s.ip))

  const newData = validData.filter((s: any) => !existingIPs.has(s.ip!))

  if (newData.length === 0) {
    return res.status(400).json(serverError('Todos los servidores ya existen en la base de datos', 'ALL_DUPLICATES'))
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

  res.json(success({ created, skipped }, `${created} servidores importados correctamente`))
}))

export default router

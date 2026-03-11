"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const index_js_1 = require("../validations/index.js");
const auditLogService_js_1 = require("../services/auditLogService.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener servidor por ID
router.get('/:id', (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const servidor = await index_1.prisma.servidor.findUnique({
        where: { id: parseInt(id) }
    });
    if (!servidor) {
        return res.status(404).json((0, apiResponse_js_1.notFound)('Servidor no encontrado'));
    }
    res.json((0, apiResponse_js_1.success)(servidor));
}));
// Obtener todos los servidores (con paginación y filtros)
router.get('/', (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { page = '1', limit = '50', search = '', pais, ambiente, estado, sortBy = 'id', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (search) {
        where.OR = [
            { nombreVM: { contains: search } },
            { ip: { contains: search } },
            { host: { contains: search } },
            { responsable: { contains: search } },
        ];
    }
    if (pais)
        where.pais = pais;
    if (ambiente)
        where.ambiente = ambiente;
    if (estado)
        where.estado = estado;
    const [servidores, total] = await Promise.all([
        index_1.prisma.servidor.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limitNum
        }),
        index_1.prisma.servidor.count({ where })
    ]);
    res.json((0, apiResponse_js_1.withPagination)(servidores, pageNum, limitNum, total));
}));
// Búsqueda avanzada
router.get('/search', (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { q = '' } = req.query;
    if (!q || q.length < 2) {
        return res.json((0, apiResponse_js_1.success)([]));
    }
    const servidores = await index_1.prisma.servidor.findMany({
        where: {
            OR: [
                { nombreVM: { contains: q } },
                { ip: { contains: q } },
                { host: { contains: q } },
                { responsable: { contains: q } },
                { sistemaOperativo: { contains: q } },
            ]
        },
        take: 20,
        orderBy: { nombreVM: 'asc' }
    });
    res.json((0, apiResponse_js_1.success)(servidores));
}));
// Crear servidor
router.post('/', (0, index_js_1.validate)(index_js_1.servidorSchema), (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const servidor = await index_1.prisma.servidor.create({
        data: req.body
    });
    // Audit log
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    (0, auditLogService_js_1.createAuditLog)({
        usuarioId: userId,
        usuario: userEmail,
        accion: 'create',
        entidad: 'Servidor',
        entidadId: servidor.id,
        datosNuevos: req.body,
        ...(0, auditLogService_js_1.getRequestInfo)(req)
    });
    res.status(201).json((0, apiResponse_js_1.success)(servidor, 'Servidor creado correctamente'));
}));
// Actualizar servidor
router.put('/:id', (0, index_js_1.validate)(index_js_1.servidorUpdateSchema), (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const servidor = await index_1.prisma.servidor.update({
        where: { id: parseInt(id) },
        data: req.body
    });
    res.json((0, apiResponse_js_1.success)(servidor, 'Servidor actualizado correctamente'));
}));
// Eliminar servidor
router.delete('/:id', (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const idNum = parseInt(id);
    const servidorPrev = await index_1.prisma.servidor.findUnique({ where: { id: idNum } });
    await index_1.prisma.servidor.delete({
        where: { id: idNum }
    });
    // Audit log
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    (0, auditLogService_js_1.createAuditLog)({
        usuarioId: userId,
        usuario: userEmail,
        accion: 'delete',
        entidad: 'Servidor',
        entidadId: idNum,
        datosPrevios: servidorPrev,
        ...(0, auditLogService_js_1.getRequestInfo)(req)
    });
    res.json((0, apiResponse_js_1.success)(null, 'Servidor eliminado correctamente'));
}));
// Eliminación masiva
router.post('/bulk-delete', (0, index_js_1.validate)(index_js_1.bulkDeleteSchema), (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { ids } = req.body;
    const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
    await index_1.prisma.servidor.deleteMany({
        where: { id: { in: numericIds } }
    });
    res.json((0, apiResponse_js_1.success)(null, `${numericIds.length} servidores eliminados`));
}));
// Importar servidores
router.post('/import', (0, index_js_1.validate)(index_js_1.servidorImportSchema), (0, apiResponse_js_1.asyncHandler)(async (req, res) => {
    const { servidores } = req.body;
    const str = (v) => {
        if (v === null || v === undefined)
            return '';
        const trimmed = String(v).trim();
        return trimmed || '';
    };
    const dataToInsert = servidores.map((s) => {
        const server = s;
        const nombreVM = server.nombreVM || server.nombreVm || server.nombrevm || '';
        const version = server.version || server.versionOs || server.versionos || '';
        const parseNumber = (v) => {
            if (v === null || v === undefined)
                return '0';
            const num = parseFloat(String(v).replace(/[^0-9.]/g, ''));
            if (isNaN(num))
                return '0';
            return Math.round(num).toString();
        };
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
        };
    });
    const validData = dataToInsert.filter((s) => s.ip);
    if (validData.length === 0) {
        return res.status(400).json((0, apiResponse_js_1.serverError)('No hay servidores con IP válida para importar', 'NO_VALID_SERVERS'));
    }
    const existingServers = await index_1.prisma.servidor.findMany({
        where: { ip: { in: validData.map((s) => s.ip) } },
        select: { ip: true }
    });
    const existingIPs = new Set(existingServers.map(s => s.ip));
    const newData = validData.filter((s) => !existingIPs.has(s.ip));
    if (newData.length === 0) {
        return res.status(400).json((0, apiResponse_js_1.serverError)('Todos los servidores ya existen en la base de datos', 'ALL_DUPLICATES'));
    }
    let created = 0;
    let skipped = 0;
    for (const server of newData) {
        try {
            await index_1.prisma.servidor.create({ data: server });
            created++;
        }
        catch (e) {
            skipped++;
        }
    }
    res.json((0, apiResponse_js_1.success)({ created, skipped }, `${created} servidores importados correctamente`));
}));
exports.default = router;

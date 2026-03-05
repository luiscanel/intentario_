"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middleware/auth");
const auditLogService_1 = require("../../services/auditLogService");
const index_1 = require("../../validations/index");
const router = (0, express_1.Router)();
// ============================================
// GESTIÓN DE CAMBIOS
// ============================================
// Obtener todos los cambios
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { estado, tipo, prioridad, buscar } = req.query;
        let where = {};
        if (estado)
            where.estado = estado;
        if (tipo)
            where.tipo = tipo;
        if (prioridad)
            where.prioridad = prioridad;
        if (buscar) {
            where.OR = [
                { titulo: { contains: buscar } },
                { descripcion: { contains: buscar } }
            ];
        }
        const cambios = await prisma_1.prisma.cambio.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: cambios });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener cambios' });
    }
});
// Obtener estadísticas de cambios
router.get('/estadisticas', auth_1.authMiddleware, async (req, res) => {
    try {
        const [total, pendientes, aprobados, rechazados, completados] = await Promise.all([
            prisma_1.prisma.cambio.count(),
            prisma_1.prisma.cambio.count({ where: { estado: 'pendiente' } }),
            prisma_1.prisma.cambio.count({ where: { estado: 'aprobado' } }),
            prisma_1.prisma.cambio.count({ where: { estado: 'rechazado' } }),
            prisma_1.prisma.cambio.count({ where: { estado: 'completado' } })
        ]);
        // Por prioridad
        const porPrioridad = await prisma_1.prisma.cambio.groupBy({
            by: ['prioridad'],
            _count: { id: true }
        });
        // Por tipo
        const porTipo = await prisma_1.prisma.cambio.groupBy({
            by: ['tipo'],
            _count: { id: true }
        });
        res.json({
            success: true,
            data: { total, pendientes, aprobados, rechazados, completados, porPrioridad, porTipo }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener cambio por ID
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const cambio = await prisma_1.prisma.cambio.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                logs: { orderBy: { createdAt: 'asc' } }
            }
        });
        if (!cambio) {
            return res.status(404).json({ success: false, message: 'Cambio no encontrado' });
        }
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener cambio' });
    }
});
// Crear cambio
router.post('/', auth_1.authMiddleware, (0, index_1.validate)(index_1.cambioSchema), async (req, res) => {
    try {
        const { titulo, descripcion, tipo, prioridad, solicitante, planRollback, serviciosAfectados, downtimeEstimado, notas } = req.body;
        const cambio = await prisma_1.prisma.cambio.create({
            data: {
                titulo,
                descripcion,
                tipo: tipo || 'normal',
                prioridad: prioridad || 'media',
                solicitante: solicitante || req.user?.email,
                estado: 'pendiente',
                planRollback,
                serviciosAfectados: serviciosAfectados ? JSON.stringify(serviciosAfectados) : null,
                downtimeEstimado,
                notas
            }
        });
        // Crear log inicial
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'created',
                detalles: JSON.stringify({ titulo, tipo, prioridad })
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'create',
            entidad: 'Cambio',
            entidadId: cambio.id,
            datosNuevos: { titulo },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.status(201).json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear cambio' });
    }
});
// Aprobar cambio
router.post('/:id/aprobar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comentarios } = req.body;
        const cambio = await prisma_1.prisma.cambio.update({
            where: { id: parseInt(id) },
            data: {
                estado: 'aprobado',
                aprobador: req.user?.email,
                fechaAprobacion: new Date(),
                comentariosAprobacion: comentarios
            }
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'approved',
                detalles: comentarios ? JSON.stringify({ comentarios }) : null
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'update',
            entidad: 'Cambio',
            entidadId: cambio.id,
            datosNuevos: { estado: 'aprobado' },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al aprobar cambio' });
    }
});
// Rechazar cambio
router.post('/:id/rechazar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { comentarios } = req.body;
        const cambio = await prisma_1.prisma.cambio.update({
            where: { id: parseInt(id) },
            data: {
                estado: 'rechazado',
                aprobador: req.user?.email,
                fechaAprobacion: new Date(),
                comentariosAprobacion: comentarios
            }
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'rejected',
                detalles: comentarios ? JSON.stringify({ comentarios }) : null
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'update',
            entidad: 'Cambio',
            entidadId: cambio.id,
            datosNuevos: { estado: 'rechazado' },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al rechazar cambio' });
    }
});
// Iniciar cambio aprobado
router.post('/:id/iniciar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { responsable } = req.body;
        const cambio = await prisma_1.prisma.cambio.update({
            where: { id: parseInt(id) },
            data: {
                estado: 'en_progreso',
                fechaInicio: new Date(),
                responsableEjecucion: responsable || req.user?.email
            }
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'started',
                detalles: JSON.stringify({ responsable: cambio.responsableEjecucion })
            }
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar cambio' });
    }
});
// Completar cambio
router.post('/:id/completar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { downtimeReal, notas } = req.body;
        const cambioExistente = await prisma_1.prisma.cambio.findUnique({ where: { id: parseInt(id) } });
        const cambio = await prisma_1.prisma.cambio.update({
            where: { id: parseInt(id) },
            data: {
                estado: 'completado',
                fechaFin: new Date(),
                downtimeReal,
                notas: notas || cambioExistente?.notas
            }
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'completed',
                detalles: JSON.stringify({ downtimeReal })
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'update',
            entidad: 'Cambio',
            entidadId: cambio.id,
            datosNuevos: { estado: 'completado' },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al completar cambio' });
    }
});
// Cancelar cambio
router.post('/:id/cancelar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const cambioExistente = await prisma_1.prisma.cambio.findUnique({ where: { id: parseInt(id) } });
        const cambio = await prisma_1.prisma.cambio.update({
            where: { id: parseInt(id) },
            data: {
                estado: 'cancelado',
                notas: cambioExistente?.notas ? `${cambioExistente.notas}\n\nCancelado: ${motivo}` : `Cancelado: ${motivo}`
            }
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'cancelled',
                detalles: JSON.stringify({ motivo })
            }
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cancelar cambio' });
    }
});
// Actualizar cambio
router.put('/:id', auth_1.authMiddleware, (0, index_1.validate)(index_1.cambioUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, tipo, prioridad, planRollback, serviciosAfectados, downtimeEstimado, notas } = req.body;
        const cambio = await prisma_1.prisma.cambio.update({
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
        });
        await prisma_1.prisma.cambioLog.create({
            data: {
                cambioId: cambio.id,
                usuario: req.user?.email,
                accion: 'updated',
                detalles: JSON.stringify({ campos: Object.keys(req.body) })
            }
        });
        res.json({ success: true, data: cambio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar cambio' });
    }
});
// Eliminar cambio
router.delete('/:id', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.cambio.delete({
            where: { id: parseInt(id) }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'delete',
            entidad: 'Cambio',
            entidadId: parseInt(id),
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, message: 'Cambio eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar cambio' });
    }
});
exports.default = router;

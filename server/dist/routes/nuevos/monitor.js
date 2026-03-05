"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middleware/auth");
const auditLogService_1 = require("../../services/auditLogService");
const monitorService_1 = require("../../services/monitorService");
const index_1 = require("../../validations/index");
const router = (0, express_1.Router)();
// ============================================
// MONITOREO DE SERVICIOS
// ============================================
// Tipos de servicios soportados
const TIPOS_SERVICIO = ['http', 'https', 'tcp', 'ssh', 'mysql', 'postgres', 'redis', 'ping', 'dns'];
// Obtener todos los servicios monitoreados
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const servicios = await prisma_1.prisma.disponibilidad.findMany({
            orderBy: { ultimoCheck: 'desc' }
        });
        res.json({ success: true, data: servicios });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener servicios' });
    }
});
// Obtener estadísticas
router.get('/estadisticas', auth_1.authMiddleware, async (req, res) => {
    try {
        const [total, online, offline, unknown] = await Promise.all([
            prisma_1.prisma.disponibilidad.count(),
            prisma_1.prisma.disponibilidad.count({ where: { status: 'online' } }),
            prisma_1.prisma.disponibilidad.count({ where: { status: 'offline' } }),
            prisma_1.prisma.disponibilidad.count({ where: { status: 'unknown' } })
        ]);
        // Promedio de latencia
        const avgLatency = await prisma_1.prisma.disponibilidad.aggregate({
            _avg: { latency: true },
            where: { status: 'online', latency: { not: null } }
        });
        res.json({
            success: true,
            data: {
                total,
                online,
                offline,
                unknown,
                avgLatency: avgLatency._avg.latency || 0
            }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener servicio por ID
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const servicio = await prisma_1.prisma.disponibilidad.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!servicio) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        // Obtener historial reciente
        const historial = await prisma_1.prisma.historialDisponibilidad.findMany({
            where: { ip: servicio.ip },
            orderBy: { checkTime: 'desc' },
            take: 100
        });
        res.json({ success: true, data: { ...servicio, historial } });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener servicio' });
    }
});
// Obtener historial de un servicio
router.get('/:id/historial', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { horas } = req.query;
        const servicio = await prisma_1.prisma.disponibilidad.findUnique({
            where: { id: parseInt(id) }
        });
        if (!servicio) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        const horasAtras = horas ? parseInt(horas) : 24;
        const fechaInicio = new Date(Date.now() - horasAtras * 60 * 60 * 1000);
        const historial = await prisma_1.prisma.historialDisponibilidad.findMany({
            where: {
                ip: servicio.ip,
                checkTime: { gte: fechaInicio }
            },
            orderBy: { checkTime: 'asc' }
        });
        res.json({ success: true, data: historial });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
});
// Agregar servicio para monitorear
router.post('/', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.servicioSchema), async (req, res) => {
    try {
        const { ip, nombre, tipo, puerto } = req.body;
        if (!ip) {
            return res.status(400).json({ success: false, message: 'IP es requerida' });
        }
        const tipoReal = tipo || (puerto === 443 ? 'https' : 'http');
        // Hacer primer check
        const resultado = await (0, monitorService_1.checkService)(ip, tipoReal, puerto || (tipoReal === 'https' ? 443 : 80));
        const servicio = await prisma_1.prisma.disponibilidad.create({
            data: {
                ip,
                nombre: nombre || ip,
                status: resultado.status,
                latency: resultado.latency || null,
                ultimoCheck: new Date()
            }
        });
        // Registrar en historial
        await prisma_1.prisma.historialDisponibilidad.create({
            data: {
                ip,
                status: resultado.status,
                latency: resultado.latency
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'create',
            entidad: 'Disponibilidad',
            entidadId: servicio.id,
            datosNuevos: { ip, nombre, tipo },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.status(201).json({ success: true, data: servicio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al agregar servicio' });
    }
});
// Actualizar servicio
router.put('/:id', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.servicioUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { ip, nombre, tipo, puerto } = req.body;
        const servicio = await prisma_1.prisma.disponibilidad.update({
            where: { id: parseInt(id) },
            data: { ip, nombre, tipo, puerto }
        });
        res.json({ success: true, data: servicio });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
    }
});
// Eliminar servicio
router.delete('/:id', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const servicio = await prisma_1.prisma.disponibilidad.findUnique({
            where: { id: parseInt(id) }
        });
        if (servicio) {
            await prisma_1.prisma.disponibilidad.delete({
                where: { id: parseInt(id) }
            });
            (0, auditLogService_1.createAuditLog)({
                usuarioId: req.user?.id,
                usuario: req.user?.email,
                accion: 'delete',
                entidad: 'Disponibilidad',
                entidadId: parseInt(id),
                datosPrevios: { ip: servicio.ip, nombre: servicio.nombre },
                ...(0, auditLogService_1.getRequestInfo)(req)
            });
        }
        res.json({ success: true, message: 'Servicio eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
    }
});
// Forzar check de un servicio
router.post('/:id/check', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const servicio = await prisma_1.prisma.disponibilidad.findUnique({
            where: { id: parseInt(id) }
        });
        if (!servicio) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        const puerto = req.body.puerto || (servicio.ip.includes(':') ? parseInt(servicio.ip.split(':')[1]) : 80);
        const resultado = await (0, monitorService_1.checkService)(servicio.ip, servicio.nombre || 'http', puerto);
        const actualizado = await prisma_1.prisma.disponibilidad.update({
            where: { id: parseInt(id) },
            data: {
                status: resultado.status,
                latency: resultado.latency || null,
                ultimoCheck: new Date()
            }
        });
        // Registrar en historial
        await prisma_1.prisma.historialDisponibilidad.create({
            data: {
                ip: servicio.ip,
                status: resultado.status,
                latency: resultado.latency
            }
        });
        // Si está offline, crear alerta
        if (resultado.status === 'offline') {
            await prisma_1.prisma.alerta.create({
                data: {
                    tipo: 'error',
                    titulo: `Servicio caído: ${servicio.nombre}`,
                    mensaje: `El servicio en ${servicio.ip} no responde.`,
                    entidad: 'Disponibilidad',
                    entidadId: servicio.id
                }
            });
        }
        res.json({ success: true, data: actualizado });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al hacer check' });
    }
});
// Tipos de servicio disponibles
router.get('/tipos/lista', (req, res) => {
    res.json({ success: true, data: TIPOS_SERVICIO });
});
exports.default = router;

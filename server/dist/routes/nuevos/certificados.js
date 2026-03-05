"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middleware/auth");
const auditLogService_1 = require("../../services/auditLogService");
const index_1 = require("../../validations/index");
const router = (0, express_1.Router)();
// ============================================
// CERTIFICADOS SSL
// ============================================
// Obtener todos los certificados
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { vencidos, porVencer } = req.query;
        let where = { activo: true };
        if (vencidos === 'true') {
            where.fechaVencimiento = { lt: new Date() };
        }
        if (porVencer === 'true') {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() + 30);
            where.fechaVencimiento = {
                gte: new Date(),
                lte: fechaLimite
            };
        }
        const certificados = await prisma_1.prisma.certificadoSSL.findMany({
            where,
            include: {
                proveedor: true,
                servidor: { select: { id: true, host: true, ip: true } }
            },
            orderBy: { fechaVencimiento: 'asc' }
        });
        res.json({ success: true, data: certificados });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener certificados' });
    }
});
// Obtener estadísticas de certificados
router.get('/estadisticas', auth_1.authMiddleware, async (req, res) => {
    try {
        const ahora = new Date();
        const proximoMes = new Date();
        proximoMes.setDate(proximoMes.getDate() + 30);
        const [total, vencidos, porVencer, activos] = await Promise.all([
            prisma_1.prisma.certificadoSSL.count({ where: { activo: true } }),
            prisma_1.prisma.certificadoSSL.count({
                where: { activo: true, fechaVencimiento: { lt: ahora } }
            }),
            prisma_1.prisma.certificadoSSL.count({
                where: {
                    activo: true,
                    fechaVencimiento: { gte: ahora, lte: proximoMes }
                }
            }),
            prisma_1.prisma.certificadoSSL.count({
                where: { activo: true, fechaVencimiento: { gt: proximoMes } }
            })
        ]);
        // Por emisor
        const porEmisor = await prisma_1.prisma.certificadoSSL.groupBy({
            by: ['emisor'],
            _count: { id: true },
            where: { activo: true, emisor: { not: null } }
        });
        res.json({
            success: true,
            data: { total, vencidos, porVencer, activos, porEmisor }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener certificado por ID
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const certificado = await prisma_1.prisma.certificadoSSL.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                proveedor: true,
                servidor: true
            }
        });
        if (!certificado) {
            return res.status(404).json({ success: false, message: 'Certificado no encontrado' });
        }
        res.json({ success: true, data: certificado });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener certificado' });
    }
});
// Crear certificado
router.post('/', auth_1.authMiddleware, (0, index_1.validate)(index_1.certificadoSchema), async (req, res) => {
    try {
        const { dominio, tipo, emisor, fechaEmision, fechaVencimiento, proveedorId, servidorId, notas } = req.body;
        const certificado = await prisma_1.prisma.certificadoSSL.create({
            data: {
                dominio,
                tipo: tipo || 'single',
                emisor,
                fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
                fechaVencimiento: new Date(fechaVencimiento),
                proveedorId: proveedorId ? parseInt(proveedorId) : null,
                servidorId: servidorId ? parseInt(servidorId) : null,
                notas
            }
        });
        // Audit log
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'create',
            entidad: 'CertificadoSSL',
            entidadId: certificado.id,
            datosNuevos: { dominio },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.status(201).json({ success: true, data: certificado });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear certificado' });
    }
});
// Actualizar certificado
router.put('/:id', auth_1.authMiddleware, (0, index_1.validate)(index_1.certificadoUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { dominio, tipo, emisor, fechaEmision, fechaVencimiento, proveedorId, servidorId, notas, activo } = req.body;
        const certificado = await prisma_1.prisma.certificadoSSL.update({
            where: { id: parseInt(id) },
            data: {
                dominio,
                tipo,
                emisor,
                fechaEmision: fechaEmision ? new Date(fechaEmision) : undefined,
                fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
                proveedorId: proveedorId ? parseInt(proveedorId) : undefined,
                servidorId: servidorId ? parseInt(servidorId) : undefined,
                notas,
                activo
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'update',
            entidad: 'CertificadoSSL',
            entidadId: certificado.id,
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, data: certificado });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar certificado' });
    }
});
// Eliminar certificado
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.certificadoSSL.delete({
            where: { id: parseInt(id) }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'delete',
            entidad: 'CertificadoSSL',
            entidadId: parseInt(id),
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, message: 'Certificado eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar certificado' });
    }
});
exports.default = router;

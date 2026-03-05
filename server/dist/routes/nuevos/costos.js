"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middleware/auth");
const auditLogService_1 = require("../../services/auditLogService");
const index_1 = require("../../validations/index");
const router = (0, express_1.Router)();
// ============================================
// COSTOS CLOUD
// ============================================
// Obtener todos los costos
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { proveedor, cuenta, servicio, mes, anio } = req.query;
        let where = {};
        if (proveedor)
            where.proveedor = proveedor;
        if (cuenta)
            where.cuenta = cuenta;
        if (servicio)
            where.servicio = servicio;
        if (mes)
            where.mes = mes;
        if (anio)
            where.mes = { contains: anio };
        const costos = await prisma_1.prisma.costoCloud.findMany({
            where,
            orderBy: { mes: 'desc' }
        });
        res.json({ success: true, data: costos });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener costos' });
    }
});
// Obtener estadísticas de costos
router.get('/estadisticas', auth_1.authMiddleware, async (req, res) => {
    try {
        const [total, proveedores, servicios, cuentas] = await Promise.all([
            prisma_1.prisma.costoCloud.aggregate({ _sum: { monto: true } }),
            prisma_1.prisma.costoCloud.groupBy({ by: ['proveedor'], _count: { id: true } }),
            prisma_1.prisma.costoCloud.groupBy({ by: ['servicio'], _count: { id: true } }),
            prisma_1.prisma.costoCloud.groupBy({ by: ['cuenta'], _count: { id: true } })
        ]);
        res.json({
            success: true,
            data: {
                total: total._sum.monto || 0,
                proveedores: proveedores.length,
                servicios: servicios.length,
                cuentas: cuentas.length
            }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener estadísticas/resumen de costos
router.get('/resumen', auth_1.authMiddleware, async (req, res) => {
    try {
        const { anio } = req.query;
        // Costos por proveedor
        const porProveedor = await prisma_1.prisma.costoCloud.groupBy({
            by: ['proveedor'],
            _sum: { monto: true },
            _count: { id: true }
        });
        // Costos por servicio
        const porServicio = await prisma_1.prisma.costoCloud.groupBy({
            by: ['servicio'],
            _sum: { monto: true },
            _count: { id: true }
        });
        // Costos por cuenta
        const porCuenta = await prisma_1.prisma.costoCloud.groupBy({
            by: ['cuenta'],
            _sum: { monto: true },
            _count: { id: true }
        });
        // Total general
        const total = await prisma_1.prisma.costoCloud.aggregate({
            _sum: { monto: true }
        });
        // Por mes (últimos 12 meses)
        const ultimos12Meses = [];
        for (let i = 0; i < 12; i++) {
            const fecha = new Date();
            fecha.setMonth(fecha.getMonth() - i);
            const mesStr = fecha.toISOString().slice(0, 7);
            const resultado = await prisma_1.prisma.costoCloud.aggregate({
                _sum: { monto: true },
                where: { mes: mesStr }
            });
            ultimos12Meses.push({
                mes: mesStr,
                monto: resultado._sum.monto || 0
            });
        }
        res.json({
            success: true,
            data: {
                total: total._sum.monto || 0,
                porProveedor,
                porServicio,
                porCuenta,
                ultimos12Meses: ultimos12Meses.reverse()
            }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener resumen' });
    }
});
// Obtener costos por mes específico
router.get('/mes/:mes', auth_1.authMiddleware, async (req, res) => {
    try {
        const { mes } = req.params;
        const costos = await prisma_1.prisma.costoCloud.findMany({
            where: { mes },
            orderBy: { monto: 'desc' }
        });
        const total = await prisma_1.prisma.costoCloud.aggregate({
            _sum: { monto: true },
            where: { mes }
        });
        res.json({
            success: true,
            data: {
                costos,
                total: total._sum.monto || 0,
                mes
            }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener costos del mes' });
    }
});
// Agregar costo manualmente
router.post('/', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.costoSchema), async (req, res) => {
    try {
        const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = req.body;
        // Verificar si ya existe
        const existente = await prisma_1.prisma.costoCloud.findFirst({
            where: { proveedor, cuenta, servicio, region: region || null, mes }
        });
        if (existente) {
            // Actualizar monto
            const costo = await prisma_1.prisma.costoCloud.update({
                where: { id: existente.id },
                data: {
                    monto: existente.monto + monto
                }
            });
            return res.json({ success: true, data: costo, message: 'Costo actualizado' });
        }
        const costo = await prisma_1.prisma.costoCloud.create({
            data: {
                proveedor,
                cuenta,
                servicio,
                region,
                mes,
                moneda: moneda || 'USD',
                monto,
                etiquetas: etiquetas ? JSON.stringify(etiquetas) : null
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'create',
            entidad: 'CostoCloud',
            entidadId: costo.id,
            datosNuevos: { proveedor, servicio, mes, monto },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.status(201).json({ success: true, data: costo });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al agregar costo' });
    }
});
// Importar costos (bulk)
router.post('/importar', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        const { costos } = req.body; // Array de objetos de costos
        if (!Array.isArray(costos) || costos.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere un array de costos' });
        }
        const resultados = [];
        for (const costo of costos) {
            const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = costo;
            const existente = await prisma_1.prisma.costoCloud.findFirst({
                where: { proveedor, cuenta, servicio, region: region || null, mes }
            });
            if (existente) {
                await prisma_1.prisma.costoCloud.update({
                    where: { id: existente.id },
                    data: { monto: existente.monto + monto }
                });
                resultados.push({ ...costo, accion: 'actualizado' });
            }
            else {
                await prisma_1.prisma.costoCloud.create({
                    data: {
                        proveedor,
                        cuenta,
                        servicio,
                        region,
                        mes,
                        moneda: moneda || 'USD',
                        monto,
                        etiquetas: etiquetas ? JSON.stringify(etiquetas) : null
                    }
                });
                resultados.push({ ...costo, accion: 'creado' });
            }
        }
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'import',
            entidad: 'CostoCloud',
            datosNuevos: { cantidad: costos.length },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({
            success: true,
            message: `${resultados.length} costos importados`,
            data: resultados
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al importar costos' });
    }
});
// Actualizar costo
router.put('/:id', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.costoUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { proveedor, cuenta, servicio, region, mes, moneda, monto, etiquetas } = req.body;
        const costo = await prisma_1.prisma.costoCloud.update({
            where: { id: parseInt(id) },
            data: {
                proveedor,
                cuenta,
                servicio,
                region,
                mes,
                moneda,
                monto,
                etiquetas: etiquetas ? JSON.stringify(etiquetas) : undefined
            }
        });
        res.json({ success: true, data: costo });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar costo' });
    }
});
// Eliminar costo
router.delete('/:id', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.costoCloud.delete({
            where: { id: parseInt(id) }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'delete',
            entidad: 'CostoCloud',
            entidadId: parseInt(id),
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, message: 'Costo eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar costo' });
    }
});
exports.default = router;

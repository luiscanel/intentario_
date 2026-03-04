"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const index_js_1 = require("../validations/index.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener todos los contratos
router.get('/', async (req, res) => {
    try {
        const { estado, proveedorId, tipo, buscar } = req.query;
        const where = {};
        if (estado)
            where.estado = estado;
        if (proveedorId)
            where.proveedorId = parseInt(proveedorId);
        if (tipo)
            where.tipo = tipo;
        if (buscar) {
            where.OR = [
                { objeto: { contains: buscar } },
                { numero: { contains: buscar } },
                { observaciones: { contains: buscar } }
            ];
        }
        const contratos = await index_1.prisma.contrato.findMany({
            where,
            orderBy: { fechaFin: 'asc' },
            include: {
                proveedor: true,
                documentos: true
            }
        });
        res.json({ success: true, data: contratos });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener contratos' });
    }
});
// Obtener contratos por vencer
router.get('/por-vencer', async (req, res) => {
    try {
        const { dias = 30 } = req.query;
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias));
        const contratos = await index_1.prisma.contrato.findMany({
            where: {
                fechaFin: { lte: fechaLimite },
                estado: 'Activo'
            },
            orderBy: { fechaFin: 'asc' },
            include: { proveedor: true }
        });
        res.json({ success: true, data: contratos });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener contratos por vencer' });
    }
});
// Obtener estadísticas de contratos
router.get('/estadisticas', async (req, res) => {
    try {
        const ahora = new Date();
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        const proximaSemana = new Date();
        proximaSemana.setDate(proximaSemana.getDate() + 7);
        const [total, activos, porVencer, porVencerSemana, vencidos, porMonto] = await Promise.all([
            index_1.prisma.contrato.count(),
            index_1.prisma.contrato.count({ where: { estado: 'Activo' } }),
            index_1.prisma.contrato.count({
                where: {
                    fechaFin: { lte: proximoMes },
                    estado: 'Activo'
                }
            }),
            index_1.prisma.contrato.count({
                where: {
                    fechaFin: { lte: proximaSemana },
                    estado: 'Activo'
                }
            }),
            index_1.prisma.contrato.count({
                where: {
                    fechaFin: { lt: ahora },
                    estado: 'Activo'
                }
            }),
            index_1.prisma.contrato.aggregate({
                where: { estado: 'Activo' },
                _sum: { monto: true }
            })
        ]);
        // Contratos por tipo
        const porTipo = await index_1.prisma.contrato.groupBy({
            by: ['tipo'],
            _count: { id: true }
        });
        // Contratos por proveedor
        const porProveedor = await index_1.prisma.contrato.groupBy({
            by: ['proveedorId'],
            _count: { id: true },
            where: { proveedorId: { not: null } }
        });
        // Obtener nombres de proveedores
        const proveedores = await index_1.prisma.proveedor.findMany({
            where: { id: { in: porProveedor.map(p => p.proveedorId) } },
            select: { id: true, nombre: true }
        });
        res.json({
            success: true,
            data: {
                total,
                activos,
                porVencer,
                porVencerSemana,
                vencidos,
                montoTotal: porMonto._sum.monto || 0,
                porTipo: porTipo.map(p => ({ tipo: p.tipo, cantidad: p._count.id })),
                porProveedor: porProveedor.map(p => ({
                    proveedorId: p.proveedorId,
                    proveedor: proveedores.find(pr => pr.id === p.proveedorId)?.nombre,
                    cantidad: p._count.id
                }))
            }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener contrato por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contrato = await index_1.prisma.contrato.findUnique({
            where: { id: parseInt(id) },
            include: {
                proveedor: true,
                documentos: true
            }
        });
        if (!contrato) {
            return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
        }
        res.json({ success: true, data: contrato });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener contrato' });
    }
});
// Crear contrato
router.post('/', (0, index_js_1.validate)(index_js_1.contratoSchema), async (req, res) => {
    try {
        const contrato = await index_1.prisma.contrato.create({
            data: req.body,
            include: { proveedor: true }
        });
        res.status(201).json({ success: true, data: contrato });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear contrato' });
    }
});
// Actualizar contrato
router.put('/:id', (0, index_js_1.validate)(index_js_1.contratoUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const contrato = await index_1.prisma.contrato.update({
            where: { id: parseInt(id) },
            data: req.body,
            include: { proveedor: true }
        });
        res.json({ success: true, data: contrato });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar contrato' });
    }
});
// Eliminar contrato
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.contrato.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Contrato eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar contrato' });
    }
});
// Eliminación masiva
router.post('/bulk-delete', (0, index_js_1.validate)(index_js_1.bulkDeleteSchema), async (req, res) => {
    try {
        const { ids } = req.body;
        const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
        await index_1.prisma.contrato.deleteMany({ where: { id: { in: numericIds } } });
        res.json({ success: true, message: `${numericIds.length} contratos eliminados` });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error en eliminación masiva' });
    }
});
// Renovar contrato (crea uno nuevo basado en el anterior)
router.post('/:id/renovar', async (req, res) => {
    try {
        const { id } = req.params;
        const { fechaInicio, fechaFin, monto, observaciones } = req.body;
        const contratoOriginal = await index_1.prisma.contrato.findUnique({
            where: { id: parseInt(id) }
        });
        if (!contratoOriginal) {
            return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
        }
        // Crear nuevo contrato como renovación
        const nuevoContrato = await index_1.prisma.contrato.create({
            data: {
                proveedorId: contratoOriginal.proveedorId,
                tipo: contratoOriginal.tipo,
                numero: contratoOriginal.numero ? `${contratoOriginal.numero}-R` : null,
                objeto: contratoOriginal.objeto,
                monto: monto || contratoOriginal.monto,
                moneda: contratoOriginal.moneda,
                fechaInicio: new Date(fechaInicio),
                fechaFin: new Date(fechaFin),
                estado: 'Activo',
                observaciones: observaciones || `Renovación del contrato #${contratoOriginal.id}`,
                diasAviso: contratoOriginal.diasAviso
            },
            include: { proveedor: true }
        });
        // Actualizar contrato original a estado renovado
        await index_1.prisma.contrato.update({
            where: { id: parseInt(id) },
            data: { estado: 'Renovado' }
        });
        res.status(201).json({ success: true, data: nuevoContrato });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al renovar contrato' });
    }
});
exports.default = router;

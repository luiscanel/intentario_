"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const index_js_1 = require("../validations/index.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener todas las licencias
router.get('/', async (req, res) => {
    try {
        const licencias = await index_1.prisma.licencia.findMany({
            orderBy: { nombre: 'asc' },
            include: { proveedor: true }
        });
        res.json({ success: true, data: licencias });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener licencias' });
    }
});
// Obtener licencias por vencer (próximos 30 días)
router.get('/por-vencer', async (req, res) => {
    try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);
        const licencias = await index_1.prisma.licencia.findMany({
            where: {
                fechaVencimiento: { lte: fechaLimite },
                activa: true
            },
            orderBy: { fechaVencimiento: 'asc' },
            include: { proveedor: true }
        });
        res.json({ success: true, data: licencias });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener licencias por vencer' });
    }
});
// Obtener licencia por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const licencia = await index_1.prisma.licencia.findUnique({
            where: { id: parseInt(id) },
            include: { proveedor: true }
        });
        if (!licencia) {
            return res.status(404).json({ success: false, message: 'Licencia no encontrada' });
        }
        res.json({ success: true, data: licencia });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener licencia' });
    }
});
// Crear licencia
router.post('/', (0, index_js_1.validate)(index_js_1.licenciaSchema), async (req, res) => {
    try {
        const licencia = await index_1.prisma.licencia.create({ data: req.body });
        res.status(201).json({ success: true, data: licencia });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear licencia' });
    }
});
// Actualizar licencia
router.put('/:id', (0, index_js_1.validate)(index_js_1.licenciaUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const licencia = await index_1.prisma.licencia.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json({ success: true, data: licencia });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar licencia' });
    }
});
// Eliminar licencia
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.licencia.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Licencia eliminada' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar licencia' });
    }
});
// Eliminación masiva
router.post('/bulk-delete', (0, index_js_1.validate)(index_js_1.bulkDeleteSchema), async (req, res) => {
    try {
        const { ids } = req.body;
        const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
        await index_1.prisma.licencia.deleteMany({ where: { id: { in: numericIds } } });
        res.json({ success: true, message: `${numericIds.length} licencias eliminadas` });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error en eliminación masiva' });
    }
});
exports.default = router;

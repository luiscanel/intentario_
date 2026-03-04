"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const index_js_1 = require("../validations/index.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener todos los proveedores
router.get('/', async (req, res) => {
    try {
        const proveedores = await index_1.prisma.proveedor.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json({ success: true, data: proveedores });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener proveedores', code: 'FETCH_ERROR' });
    }
});
// Obtener proveedor por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await index_1.prisma.proveedor.findUnique({
            where: { id: parseInt(id) },
            include: {
                contratos: { orderBy: { fechaInicio: 'desc' } },
                licencias: { orderBy: { fechaVencimiento: 'asc' } }
            }
        });
        if (!proveedor) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
        }
        res.json({ success: true, data: proveedor });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener proveedor' });
    }
});
// Crear proveedor
router.post('/', (0, index_js_1.validate)(index_js_1.proveedorSchema), async (req, res) => {
    try {
        const proveedor = await index_1.prisma.proveedor.create({ data: req.body });
        res.status(201).json({ success: true, data: proveedor });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear proveedor' });
    }
});
// Actualizar proveedor
router.put('/:id', (0, index_js_1.validate)(index_js_1.proveedorUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await index_1.prisma.proveedor.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json({ success: true, data: proveedor });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar proveedor' });
    }
});
// Eliminar proveedor
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.proveedor.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Proveedor eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar proveedor' });
    }
});
// Eliminación masiva
router.post('/bulk-delete', (0, index_js_1.validate)(index_js_1.bulkDeleteSchema), async (req, res) => {
    try {
        const { ids } = req.body;
        const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
        await index_1.prisma.proveedor.deleteMany({ where: { id: { in: numericIds } } });
        res.json({ success: true, message: `${numericIds.length} proveedores eliminados` });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error en eliminación masiva' });
    }
});
exports.default = router;

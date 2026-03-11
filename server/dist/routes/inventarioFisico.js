"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const index_js_1 = require("../validations/index.js");
const logger_js_1 = require("../utils/logger.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener todos los items
router.get('/', async (req, res) => {
    try {
        const items = await index_1.prisma.inventarioFisico.findMany({
            orderBy: { id: 'desc' }
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        logger_js_1.log.error('Error al obtener inventario físico', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: 'Error al obtener inventario físico',
            code: 'FETCH_ERROR'
        });
    }
});
// Crear item
router.post('/', (0, index_js_1.validate)(index_js_1.inventarioFisicoSchema), async (req, res) => {
    try {
        const item = await index_1.prisma.inventarioFisico.create({
            data: req.body
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        logger_js_1.log.error('Error al crear item', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: 'Error al crear item',
            code: 'CREATE_ERROR'
        });
    }
});
// Actualizar item
router.put('/:id', (0, index_js_1.validate)(index_js_1.inventarioFisicoUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const item = await index_1.prisma.inventarioFisico.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json({ success: true, data: item });
    }
    catch (error) {
        logger_js_1.log.error('Error al actualizar item', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: 'Error al actualizar item',
            code: 'UPDATE_ERROR'
        });
    }
});
// Eliminar item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.inventarioFisico.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Item eliminado' });
    }
    catch (error) {
        logger_js_1.log.error('Error al eliminar item', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: 'Error al eliminar item',
            code: 'DELETE_ERROR'
        });
    }
});
// Eliminación masiva
router.post('/bulk-delete', (0, index_js_1.validate)(index_js_1.bulkDeleteSchema), async (req, res) => {
    try {
        const { ids } = req.body;
        // Convertir strings a números
        const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id));
        await index_1.prisma.inventarioFisico.deleteMany({
            where: { id: { in: numericIds } }
        });
        res.json({ success: true, message: `${numericIds.length} equipos eliminados` });
    }
    catch (error) {
        logger_js_1.log.error('Error en eliminación masiva', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: 'Error en eliminación masiva',
            code: 'BULK_DELETE_ERROR'
        });
    }
});
// Importar items
router.post('/import', (0, index_js_1.validate)(index_js_1.inventarioFisicoImportSchema), async (req, res) => {
    try {
        const { items } = req.body;
        const str = (v) => {
            if (v === null || v === undefined)
                return '';
            const trimmed = String(v).trim();
            return trimmed || '';
        };
        const dataToInsert = items.map((s) => ({
            pais: str(s.pais) || 'Colombia',
            categoria: str(s.categoria) || 'Servidor',
            marca: str(s.marca) || 'Dell',
            modelo: str(s.modelo),
            serie: str(s.serie),
            inventario: str(s.inventario),
            estado: str(s.estado) || 'Activo',
            responsable: str(s.responsable),
            observaciones: str(s.observaciones) || str(s.descripcion),
            equipo: str(s.equipo),
            direccionIp: str(s.direccionIp),
            ilo: str(s.ilo),
            serial: str(s.serial),
            sistemaOperativo: str(s.sistemaOperativo),
            garantia: str(s.garantia)
        }));
        // Filtrar items válidos (al menos equipo, IP o serie)
        const validData = dataToInsert.filter((s) => s.equipo || s.direccionIp || s.serie);
        if (validData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay items válidos para importar',
                code: 'NO_VALID_ITEMS'
            });
        }
        let created = 0;
        let skipped = 0;
        for (const item of validData) {
            try {
                await index_1.prisma.inventarioFisico.create({ data: item });
                created++;
            }
            catch (e) {
                // Ignorar duplicados
                skipped++;
            }
        }
        res.json({
            success: true,
            message: `${created} items importados correctamente`,
            count: created,
            skipped
        });
    }
    catch (error) {
        logger_js_1.log.error('Error al importar inventario físico', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({
            success: false,
            message: `Error al importar: ${error.message}`,
            code: 'IMPORT_ERROR'
        });
    }
});
exports.default = router;

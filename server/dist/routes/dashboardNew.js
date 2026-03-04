"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dashboardService_1 = require("../services/dashboardService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/security', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getSecurityStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error security stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de seguridad' });
    }
});
router.get('/resources', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getResourcesStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error resources stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de recursos' });
    }
});
router.get('/availability', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getAvailabilityStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error availability stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de disponibilidad' });
    }
});
router.get('/physical', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getPhysicalStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error physical stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de inventario físico' });
    }
});
router.get('/responsables', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getResponsablesStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error responsables stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de responsables' });
    }
});
router.get('/cloud', async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getCloudStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error cloud stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de cloud' });
    }
});
exports.default = router;

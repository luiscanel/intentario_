"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dashboardService_1 = require("../services/dashboardService");
const cacheService_1 = require("../services/cacheService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Cache de 5 minutos para dashboards (se puede ajustar)
const dashboardCache = (0, cacheService_1.cacheMiddleware)(5 * 60 * 1000);
router.get('/security', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getSecurityStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error security stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de seguridad' });
    }
});
router.get('/resources', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getResourcesStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error resources stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de recursos' });
    }
});
router.get('/availability', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getAvailabilityStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error availability stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de disponibilidad' });
    }
});
router.get('/physical', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getPhysicalStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error physical stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de inventario físico' });
    }
});
router.get('/responsables', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getResponsablesStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error responsables stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de responsables' });
    }
});
router.get('/cloud', dashboardCache, async (req, res) => {
    try {
        const stats = await (0, dashboardService_1.getCloudStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error cloud stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de cloud' });
    }
});
// Endpoint para invalidar cache (usado cuando hay cambios en datos)
router.post('/refresh', async (req, res) => {
    try {
        (0, cacheService_1.invalidateCache)('/api/dashboard');
        res.json({ success: true, message: 'Cache de dashboards invalidado' });
    }
    catch (error) {
        console.error('Error invalidating cache:', error);
        res.status(500).json({ message: 'Error al invalidar cache' });
    }
});
exports.default = router;

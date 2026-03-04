"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const dashboardService_1 = require("../services/dashboardService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/stats', async (req, res) => {
    try {
        // Stats de Servidores (VMs)
        const servidores = await index_1.prisma.servidor.findMany();
        const totalVMs = servidores.length;
        const vmsActivos = servidores.filter(s => s.estado === 'Activo').length;
        const vmsInactivos = servidores.filter(s => s.estado === 'Inactivo').length;
        const vmsMantenimiento = servidores.filter(s => s.estado === 'Mantenimiento').length;
        const vmsDecomisionados = servidores.filter(s => s.estado === 'Decomisionado').length;
        // Antivirus stats - detectar "sin antivirus" como no protegido
        const isProtected = (av) => {
            if (!av || !av.trim())
                return false;
            const v = av.toLowerCase().trim();
            return v !== 'sin antivirus' && v !== 'ninguno' && v !== 'no';
        };
        const conAntivirus = servidores.filter(s => isProtected(s.antivirus)).length;
        const sinAntivirus = totalVMs - conAntivirus;
        // Por país (VMs)
        const paisCount = {};
        servidores.forEach(s => {
            const pais = s.pais || 'Sin país';
            paisCount[pais] = (paisCount[pais] || 0) + 1;
        });
        const porPais = Object.entries(paisCount).map(([pais, count]) => ({ pais, count })).sort((a, b) => b.count - a.count);
        // Por ambiente (VMs)
        const ambienteCount = {};
        servidores.forEach(s => {
            ambienteCount[s.ambiente] = (ambienteCount[s.ambiente] || 0) + 1;
        });
        const porAmbiente = Object.entries(ambienteCount).map(([ambiente, count]) => ({ ambiente, count }));
        // Por estado (VMs)
        const estadoCount = {};
        servidores.forEach(s => {
            estadoCount[s.estado] = (estadoCount[s.estado] || 0) + 1;
        });
        const porEstado = Object.entries(estadoCount).map(([estado, count]) => ({ estado, count }));
        // Por sistema operativo (VMs)
        const soCount = {};
        servidores.forEach(s => {
            const so = s.sistemaOperativo || 'Sin especificar';
            soCount[so] = (soCount[so] || 0) + 1;
        });
        const porSO = Object.entries(soCount).map(([so, count]) => ({ so, count })).sort((a, b) => b.count - a.count);
        // Por sistema operativo con versión (VMs)
        const soVersionCount = {};
        servidores.forEach(s => {
            const so = s.sistemaOperativo || 'Sin especificar';
            const version = s.version || '';
            const soVersion = version ? `${so} ${version}` : so;
            soVersionCount[soVersion] = (soVersionCount[soVersion] || 0) + 1;
        });
        const porSOConVersion = Object.entries(soVersionCount).map(([so, count]) => ({ so, count })).sort((a, b) => b.count - a.count);
        // Stats de Inventario Físico
        const inventarioFisico = await index_1.prisma.inventarioFisico.findMany();
        const totalFisico = inventarioFisico.length;
        // Por país (Físico)
        const paisFisicoCount = {};
        inventarioFisico.forEach(s => {
            const pais = s.pais || 'Sin país';
            paisFisicoCount[pais] = (paisFisicoCount[pais] || 0) + 1;
        });
        const porPaisFisico = Object.entries(paisFisicoCount).map(([pais, count]) => ({ pais, count })).sort((a, b) => b.count - a.count);
        // Por categoría (Físico)
        const categoriaCount = {};
        inventarioFisico.forEach(s => {
            const cat = s.categoria || 'Sin categoría';
            categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
        });
        const porCategoria = Object.entries(categoriaCount).map(([categoria, count]) => ({ categoria, count }));
        // Por marca (Físico)
        const marcaCount = {};
        inventarioFisico.forEach(s => {
            const marca = s.marca || 'Sin marca';
            marcaCount[marca] = (marcaCount[marca] || 0) + 1;
        });
        const porMarca = Object.entries(marcaCount).map(([marca, count]) => ({ marca, count })).sort((a, b) => b.count - a.count);
        // Stats de Cloud
        const cloudStats = await (0, dashboardService_1.getCloudStats)();
        res.json({
            // VMs
            totalVMs,
            vmsActivos,
            vmsInactivos,
            vmsMantenimiento,
            vmsDecomisionados,
            conAntivirus,
            sinAntivirus,
            porPais,
            porAmbiente,
            porEstado,
            porSO,
            porSOConVersion,
            // Inventario Físico
            totalFisico,
            porPaisFisico,
            porCategoria,
            porMarca,
            // Cloud
            ...cloudStats
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});
exports.default = router;

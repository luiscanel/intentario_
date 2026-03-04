"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Función para hacer ping
async function pingHost(ip) {
    try {
        const platform = process.platform;
        let command;
        if (platform === 'win32') {
            command = `ping -n 1 -w 1000 ${ip}`;
        }
        else {
            command = `ping -c 1 -W 1 ${ip}`;
        }
        const { stdout } = await execAsync(command, { timeout: 5000 });
        // Extraer latencia
        let latency = null;
        if (platform === 'win32') {
            const match = stdout.match(/time[=<](\d+)ms/i);
            if (match)
                latency = parseInt(match[1]);
        }
        else {
            const match = stdout.match(/time=(\d+\.?\d*)\s*ms/i);
            if (match)
                latency = parseInt(match[1]);
        }
        return { status: 'online', latency };
    }
    catch (error) {
        return { status: 'offline', latency: null };
    }
}
// Obtener estado de todos los servidores monitoreados
router.get('/', async (req, res) => {
    try {
        const Disponibilidades = await index_1.prisma.disponibilidad.findMany({
            orderBy: { ultimoCheck: 'desc' }
        });
        res.json({ success: true, data: Disponibilidades });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' });
    }
});
// Obtener servidores del inventario que no están siendo monitoreados
router.get('/disponibles', async (req, res) => {
    try {
        const servidores = await index_1.prisma.servidor.findMany({
            select: { id: true, host: true, ip: true, nombreVM: true }
        });
        const monitoreados = await index_1.prisma.disponibilidad.findMany({
            select: { ip: true }
        });
        const ipsMonitoreadas = new Set(monitoreados.map(d => d.ip));
        const disponibles = servidores.filter(s => s.ip && !ipsMonitoreadas.has(s.ip));
        res.json({ success: true, data: disponibles });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener servidores disponibles' });
    }
});
// Agregar servidor al monitoreo
router.post('/', async (req, res) => {
    try {
        const { servidorId, ip, nombre } = req.body;
        if (!ip) {
            return res.status(400).json({ success: false, message: 'IP requerida' });
        }
        // Verificar si ya existe
        const existente = await index_1.prisma.disponibilidad.findFirst({
            where: { ip }
        });
        if (existente) {
            return res.status(400).json({ success: false, message: 'IP ya está siendo monitoreada' });
        }
        const disponibilidad = await index_1.prisma.disponibilidad.create({
            data: {
                servidorId: servidorId || null,
                ip,
                nombre: nombre || ip,
                status: 'unknown',
                ultimoCheck: new Date()
            }
        });
        res.status(201).json({ success: true, data: disponibilidad });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al agregar al monitoreo' });
    }
});
// Hacer ping a una IP específica
router.post('/ping/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        const result = await pingHost(ip);
        // Guardar en historial
        await index_1.prisma.historialDisponibilidad.create({
            data: {
                ip,
                status: result.status,
                latency: result.latency
            }
        });
        res.json({ success: true, ip, ...result });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al hacer ping' });
    }
});
// Hacer ping a todos los servidores monitoreados
router.post('/ping-all', async (req, res) => {
    try {
        const Disponibilidades = await index_1.prisma.disponibilidad.findMany();
        const results = [];
        for (const disp of Disponibilidades) {
            const result = await pingHost(disp.ip);
            // Actualizar estado
            await index_1.prisma.disponibilidad.update({
                where: { id: disp.id },
                data: {
                    status: result.status,
                    latency: result.latency,
                    ultimoCheck: new Date()
                }
            });
            // Guardar en historial
            await index_1.prisma.historialDisponibilidad.create({
                data: {
                    ip: disp.ip,
                    status: result.status,
                    latency: result.latency
                }
            });
            results.push({ ip: disp.ip, ...result });
        }
        // Contar resultados
        const online = results.filter(r => r.status === 'online').length;
        const offline = results.filter(r => r.status === 'offline').length;
        res.json({
            success: true,
            total: results.length,
            online,
            offline,
            results
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al hacer ping a todos' });
    }
});
// Eliminar del monitoreo
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.disponibilidad.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Eliminado del monitoreo' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
});
// Obtener historial de disponibilidad
router.get('/historial/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        const historial = await index_1.prisma.historialDisponibilidad.findMany({
            where: { ip },
            orderBy: { checkTime: 'desc' },
            take: 100
        });
        res.json({ success: true, data: historial });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
});
exports.default = router;

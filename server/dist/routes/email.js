"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const reportsService_1 = require("../services/reportsService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Obtener configuración de email
router.get('/config', async (req, res) => {
    try {
        const config = await index_1.prisma.emailConfig.findFirst({
            where: { activo: true }
        });
        if (config) {
            res.json({ ...config, contrasena: '••••••••' });
        }
        else {
            res.json(null);
        }
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al obtener configuración' });
    }
});
// Guardar configuración de email
router.post('/config', async (req, res) => {
    try {
        const { host, puerto, usuario, contrasena, usandoTls, emailFrom, activo } = req.body;
        await index_1.prisma.emailConfig.updateMany({
            where: { activo: true },
            data: { activo: false }
        });
        const config = await index_1.prisma.emailConfig.create({
            data: {
                host,
                puerto: puerto || 587,
                usuario,
                contrasena,
                usandoTls: usandoTls !== false,
                emailFrom,
                activo: activo !== false
            }
        });
        res.json({ ...config, contrasena: '••••••••' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al guardar configuración' });
    }
});
// Probar configuración de email
router.post('/test', async (req, res) => {
    try {
        const { email } = req.body;
        const config = await (0, reportsService_1.getEmailConfig)();
        if (!config) {
            return res.status(400).json({ message: 'No hay configuración de email' });
        }
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.puerto,
            secure: !config.usandoTls,
            auth: {
                user: config.usuario,
                pass: config.contrasena
            }
        });
        await transporter.sendMail({
            from: config.emailFrom,
            to: email,
            subject: 'Test - Sistema de Inventario Almo',
            html: '<p>Configuración de email correcta ✅</p>'
        });
        res.json({ success: true, message: 'Email de prueba enviado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Generar informe de VMs
router.post('/generate-vm', async (req, res) => {
    try {
        const { tipo, filtro } = req.body;
        const servidores = await index_1.prisma.servidor.findMany();
        const data = (0, reportsService_1.generateVMReport)(servidores, tipo, filtro);
        res.json({ data, total: data.length });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al generar informe' });
    }
});
// Generar informe de Inventario Físico
router.post('/generate-physical', async (req, res) => {
    try {
        const { tipo, filtro } = req.body;
        const equipos = await index_1.prisma.inventarioFisico.findMany();
        const data = (0, reportsService_1.generatePhysicalReport)(equipos, tipo, filtro);
        res.json({ data, total: data.length });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al generar informe' });
    }
});
// Generar resumen ejecutivo
router.get('/summary', async (req, res) => {
    try {
        const servidores = await index_1.prisma.servidor.findMany();
        const equiposFisicos = await index_1.prisma.inventarioFisico.findMany();
        const summary = (0, reportsService_1.generateExecutiveSummary)(servidores, equiposFisicos);
        res.json(summary);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error al generar resumen' });
    }
});
// Enviar informe por email
router.post('/send-report', async (req, res) => {
    try {
        const { email, tipo, filtro, tipoReporte, titulo } = req.body;
        let data;
        let filename;
        if (tipoReporte === 'vm') {
            const servidores = await index_1.prisma.servidor.findMany();
            data = (0, reportsService_1.generateVMReport)(servidores, filtro, tipo);
            filename = `informe_vms_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        else if (tipoReporte === 'physical') {
            const equipos = await index_1.prisma.inventarioFisico.findMany();
            data = (0, reportsService_1.generatePhysicalReport)(equipos, filtro, tipo);
            filename = `informe_equipos_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        else {
            return res.status(400).json({ message: 'Tipo de reporte no válido' });
        }
        await (0, reportsService_1.sendReportByEmail)(email, data, titulo, filename);
        res.json({ success: true, message: 'Informe enviado correctamente' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;

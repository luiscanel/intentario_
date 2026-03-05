"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middleware/auth");
const auditLogService_1 = require("../../services/auditLogService");
const email_1 = require("../../services/email");
const index_1 = require("../../validations/index");
const router = (0, express_1.Router)();
// ============================================
// BACKUPS PROGRAMADOS
// ============================================
// Calcular próximo backup
function calcularProximoBackup(frecuencia, hora, minuto, diaSemana, diaMes) {
    const ahora = new Date();
    const proximo = new Date();
    proximo.setHours(hora, minuto, 0, 0);
    if (proximo <= ahora) {
        proximo.setDate(proximo.getDate() + 1);
    }
    switch (frecuencia) {
        case 'daily':
            // Ya está configurado para diario
            break;
        case 'weekly':
            if (diaSemana !== undefined) {
                while (proximo.getDay() !== diaSemana) {
                    proximo.setDate(proximo.getDate() + 1);
                }
            }
            break;
        case 'monthly':
            if (diaMes !== undefined) {
                proximo.setDate(diaMes);
                if (proximo <= ahora) {
                    proximo.setMonth(proximo.getMonth() + 1);
                }
            }
            break;
    }
    return proximo;
}
// Obtener todos los backups programados
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const backups = await prisma_1.prisma.backupProgramado.findMany({
            include: {
                historiales: {
                    orderBy: { inicio: 'desc' },
                    take: 5
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: backups });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener backups programados' });
    }
});
// Obtener estadísticas de backups
router.get('/estadisticas', auth_1.authMiddleware, async (req, res) => {
    try {
        const [total, activos, ultimoMes] = await Promise.all([
            prisma_1.prisma.backupProgramado.count(),
            prisma_1.prisma.backupProgramado.count({ where: { activo: true } }),
            prisma_1.prisma.historialBackup.count({
                where: {
                    inicio: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            })
        ]);
        const exitosos = await prisma_1.prisma.historialBackup.count({
            where: { estado: 'success' }
        });
        const fallidos = await prisma_1.prisma.historialBackup.count({
            where: { estado: 'failed' }
        });
        res.json({
            success: true,
            data: { total, activos, ultimoMes, exitosos, fallidos }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});
// Obtener backup programado por ID
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const backup = await prisma_1.prisma.backupProgramado.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                historiales: {
                    orderBy: { inicio: 'desc' }
                }
            }
        });
        if (!backup) {
            return res.status(404).json({ success: false, message: 'Backup no encontrado' });
        }
        res.json({ success: true, data: backup });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener backup' });
    }
});
// Crear backup programado
router.post('/', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.backupProgramadoSchema), async (req, res) => {
    try {
        const { nombre, tipo, frecuencia, diaSemana, diaMes, hora, minuto, retenerDias, notificaciones, emailNotificacion } = req.body;
        const proximoBackup = calcularProximoBackup(frecuencia, hora, minuto, diaSemana, diaMes);
        const backup = await prisma_1.prisma.backupProgramado.create({
            data: {
                nombre,
                tipo: tipo || 'completo',
                frecuencia,
                diaSemana,
                diaMes,
                hora,
                minuto,
                retenerDias: retenerDias || 30,
                notificaciones: notificaciones !== false,
                emailNotificacion,
                proximoBackup
            }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'create',
            entidad: 'BackupProgramado',
            entidadId: backup.id,
            datosNuevos: { nombre, frecuencia },
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.status(201).json({ success: true, data: backup });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear backup programado' });
    }
});
// Actualizar backup programado
router.put('/:id', auth_1.authMiddleware, auth_1.requireAdmin, (0, index_1.validate)(index_1.backupProgramadoUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo, frecuencia, diaSemana, diaMes, hora, minuto, retenerDias, notificaciones, emailNotificacion, activo } = req.body;
        let proximoBackup = undefined;
        if (frecuencia || hora || minuto || diaSemana || diaMes) {
            const bk = await prisma_1.prisma.backupProgramado.findUnique({ where: { id: parseInt(id) } });
            proximoBackup = calcularProximoBackup(frecuencia || bk?.frecuencia || 'daily', hora ?? bk?.hora ?? 0, minuto ?? bk?.minuto ?? 0, diaSemana ?? bk?.diaSemana, diaMes ?? bk?.diaMes);
        }
        const backup = await prisma_1.prisma.backupProgramado.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                tipo,
                frecuencia,
                diaSemana,
                diaMes,
                hora,
                minuto,
                retenerDias,
                notificaciones,
                emailNotificacion,
                activo,
                proximoBackup
            }
        });
        res.json({ success: true, data: backup });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar backup programado' });
    }
});
// Eliminar backup programado
router.delete('/:id', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.backupProgramado.delete({
            where: { id: parseInt(id) }
        });
        (0, auditLogService_1.createAuditLog)({
            usuarioId: req.user?.id,
            usuario: req.user?.email,
            accion: 'delete',
            entidad: 'BackupProgramado',
            entidadId: parseInt(id),
            ...(0, auditLogService_1.getRequestInfo)(req)
        });
        res.json({ success: true, message: 'Backup programado eliminado' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar backup programado' });
    }
});
// Ejecutar backup ahora
router.post('/:id/ejecutar', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const backup = await prisma_1.prisma.backupProgramado.findUnique({
            where: { id: parseInt(id) }
        });
        if (!backup) {
            return res.status(404).json({ success: false, message: 'Backup no encontrado' });
        }
        // Crear registro de inicio
        const historial = await prisma_1.prisma.historialBackup.create({
            data: {
                backupId: backup.id,
                inicio: new Date(),
                estado: 'running'
            }
        });
        // Ejecutar backup (simulado - en producción sería la lógica real)
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/prisma/dev.db';
        const fs = require('fs');
        const path = require('path');
        let estado = 'success';
        let mensaje = 'Backup completado';
        let tamanoBytes = 0;
        let archivo = '';
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            archivo = `manual_${backup.nombre}_${date}.db.gz`;
            const backupPath = path.join(backupDir, archivo);
            // Copiar y comprimir
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            await execAsync(`gzip -c "${dbPath}" > "${backupPath}"`);
            tamanoBytes = fs.statSync(backupPath).size;
        }
        catch (e) {
            estado = 'failed';
            mensaje = e.message;
        }
        // Actualizar historial
        await prisma_1.prisma.historialBackup.update({
            where: { id: historial.id },
            data: {
                fin: new Date(),
                estado,
                mensaje,
                tamanoBytes,
                archivo
            }
        });
        // Actualizar backup
        const proximoBackup = calcularProximoBackup(backup.frecuencia, backup.hora, backup.minuto, backup.diaSemana || undefined, backup.diaMes || undefined);
        await prisma_1.prisma.backupProgramado.update({
            where: { id: backup.id },
            data: {
                ultimoBackup: new Date(),
                proximoBackup,
                ultimoEstado: estado,
                ultimoMensaje: mensaje
            }
        });
        // Enviar notificación por email si está configurado
        if (backup.notificaciones && backup.emailNotificacion) {
            const subject = estado === 'success'
                ? `✅ Backup completado: ${backup.nombre}`
                : `❌ Backup fallido: ${backup.nombre}`;
            const body = `
Backup: ${backup.nombre}
Estado: ${estado}
Mensaje: ${mensaje}
Tamaño: ${(tamanoBytes / 1024 / 1024).toFixed(2)} MB
Fecha: ${new Date().toLocaleString()}
      `.trim();
            if (backup.emailNotificacion) {
                await (0, email_1.sendEmail)(backup.emailNotificacion, subject, body.replace(/\n/g, '<br>')).catch(e => console.error('Error sending email:', e));
            }
        }
        res.json({
            success: true,
            data: { estado, mensaje, tamanoBytes, archivo },
            historialId: historial.id
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al ejecutar backup' });
    }
});
// Obtener historial de un backup
router.get('/:id/historial', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const historiales = await prisma_1.prisma.historialBackup.findMany({
            where: { backupId: parseInt(id) },
            orderBy: { inicio: 'desc' },
            take: 50
        });
        res.json({ success: true, data: historiales });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
});
exports.default = router;

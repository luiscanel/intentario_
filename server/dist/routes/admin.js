"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../prisma/index");
const auth_1 = require("../middleware/auth");
const logger_js_1 = require("../utils/logger.js");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.use(auth_1.requireAdmin);
// ============================================
// MÓDULOS
// ============================================
// Get all módulos
router.get('/modulos', async (req, res) => {
    try {
        const modulos = await index_1.prisma.modulo.findMany({
            include: {
                permisos: true,
                roles: { include: { rol: true } }
            },
            orderBy: { orden: 'asc' }
        });
        res.json({ success: true, data: modulos });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al obtener módulos', code: 'FETCH_ERROR' });
    }
});
// Create módulo
router.post('/modulos', async (req, res) => {
    try {
        const { nombre, descripcion, icono, orden } = req.body;
        const existing = await index_1.prisma.modulo.findUnique({ where: { nombre } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Ya existe un módulo con ese nombre', code: 'DUPLICATE_MODULO' });
        }
        // Crear permisos base para el nuevo módulo
        const modulo = await index_1.prisma.modulo.create({
            data: {
                nombre,
                descripcion: descripcion || '',
                icono: icono || 'Circle',
                orden: orden || 0,
                activo: true,
                permisos: {
                    create: [
                        { accion: 'ver' },
                        { accion: 'crear' },
                        { accion: 'editar' },
                        { accion: 'eliminar' },
                        { accion: 'exportar' }
                    ]
                }
            },
            include: { permisos: true }
        });
        res.status(201).json({ success: true, data: modulo });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al crear módulo', code: 'CREATE_ERROR' });
    }
});
// Update módulo
router.put('/modulos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, icono, orden, activo } = req.body;
        const modulo = await index_1.prisma.modulo.update({
            where: { id: parseInt(id) },
            data: {
                nombre: nombre || undefined,
                descripcion: descripcion ?? undefined,
                icono: icono || undefined,
                orden: orden || undefined,
                activo: activo ?? undefined
            },
            include: { permisos: true }
        });
        res.json({ success: true, data: modulo });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al actualizar módulo', code: 'UPDATE_ERROR' });
    }
});
// Delete módulo
router.delete('/modulos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar si hay roles usándolo
        const rolModulos = await index_1.prisma.rolModulo.count({ where: { moduloId: parseInt(id) } });
        if (rolModulos > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un módulo que está asignado a roles',
                code: 'MODULO_IN_USE'
            });
        }
        await index_1.prisma.modulo.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Módulo eliminado correctamente' });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al eliminar módulo', code: 'DELETE_ERROR' });
    }
});
// ============================================
// ROLES
// ============================================
// Get all roles
router.get('/roles', async (req, res) => {
    try {
        const roles = await index_1.prisma.rol.findMany({
            include: {
                roles: { include: { modulo: true } },
                usuarios: true
            },
            orderBy: { nombre: 'asc' }
        });
        res.json({
            success: true,
            data: roles.map(r => ({
                ...r,
                usuariosCount: r.usuarios.length,
                modulos: r.roles.map(rm => rm.modulo)
            }))
        });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al obtener roles', code: 'FETCH_ERROR' });
    }
});
// Get all permisos (agrupados por módulo)
router.get('/permisos', async (req, res) => {
    try {
        const modulos = await index_1.prisma.modulo.findMany({
            include: { permisos: true },
            orderBy: { orden: 'asc' }
        });
        const grouped = {};
        modulos.forEach(m => {
            grouped[m.nombre] = m.permisos.map(p => ({ id: p.id, accion: p.accion }));
        });
        res.json({ success: true, data: { modulos, grouped } });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al obtener permisos', code: 'FETCH_ERROR' });
    }
});
// Create rol
router.post('/roles', async (req, res) => {
    try {
        const { nombre, descripcion, moduloIds } = req.body;
        const existing = await index_1.prisma.rol.findUnique({ where: { nombre } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Ya existe un rol con ese nombre', code: 'DUPLICATE_ROLE' });
        }
        const rol = await index_1.prisma.rol.create({
            data: {
                nombre,
                descripcion: descripcion || '',
                esBase: false,
                roles: moduloIds?.length ? {
                    create: moduloIds.map((moduloId) => ({ moduloId }))
                } : undefined
            },
            include: { roles: { include: { modulo: true } } }
        });
        res.status(201).json({ success: true, data: rol });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al crear rol', code: 'CREATE_ERROR' });
    }
});
// Update rol
router.put('/roles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, moduloIds } = req.body;
        // Actualizar módulos del rol
        if (moduloIds !== undefined) {
            await index_1.prisma.rolModulo.deleteMany({ where: { rolId: parseInt(id) } });
            if (moduloIds.length > 0) {
                await index_1.prisma.rolModulo.createMany({
                    data: moduloIds.map((moduloId) => ({ rolId: parseInt(id), moduloId }))
                });
            }
        }
        const updateData = {};
        if (nombre)
            updateData.nombre = nombre;
        if (descripcion !== undefined)
            updateData.descripcion = descripcion;
        const rol = await index_1.prisma.rol.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { roles: { include: { modulo: true } } }
        });
        res.json({ success: true, data: rol });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al actualizar rol', code: 'UPDATE_ERROR' });
    }
});
// Delete rol
router.delete('/roles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await index_1.prisma.rol.findUnique({ where: { id: parseInt(id) } });
        if (rol?.esBase) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un rol base del sistema',
                code: 'CANNOT_DELETE_BASE_ROLE'
            });
        }
        const usuariosConRol = await index_1.prisma.usuarioRol.count({ where: { rolId: parseInt(id) } });
        if (usuariosConRol > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un rol que tiene usuarios asignados',
                code: 'ROLE_IN_USE'
            });
        }
        await index_1.prisma.rol.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Rol eliminado correctamente' });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al eliminar rol', code: 'DELETE_ERROR' });
    }
});
// ============================================
// USUARIOS
// ============================================
// Get all usuarios
router.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await index_1.prisma.user.findMany({
            include: {
                usuarioRoles: { include: { rol: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: usuarios.map(u => ({
                id: u.id,
                email: u.email,
                nombre: u.nombre,
                rol: u.rol,
                activo: u.activo,
                createdAt: u.createdAt,
                roles: u.usuarioRoles.map(ur => ({ id: ur.rol.id, nombre: ur.rol.nombre }))
            }))
        });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al obtener usuarios', code: 'FETCH_ERROR' });
    }
});
// Create usuario
router.post('/usuarios', async (req, res) => {
    try {
        const { email, nombre, password, rolIds, activo, enviarInvitacion } = req.body;
        // Generar contraseña temporal si no se proporciona
        const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
        const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 12);
        const usuario = await index_1.prisma.user.create({
            data: {
                email: email.toLowerCase(),
                nombre,
                password: hashedPassword,
                rol: 'user',
                activo: activo !== false,
                debeCambiarPass: true, // Force password change on first login
                usuarioRoles: rolIds?.length ? {
                    create: rolIds.map((rolId) => ({ rolId }))
                } : undefined
            }
        });
        // Enviar invitación por email si se solicita
        if (enviarInvitacion) {
            try {
                const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../services/email.js')));
                await sendEmail(usuario.email, 'Invitación a Inventario Almo', `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hola ${usuario.nombre},</h2>
              <p>Has sido invitado al sistema de Inventario Almo.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Tus credenciales de acceso:</strong></p>
                <p style="margin: 10px 0 0 0;">Email: <strong>${usuario.email}</strong></p>
                <p style="margin: 5px 0 0 0;">Contraseña temporal: <strong>${tempPassword}</strong></p>
              </div>
              <p><strong>Importante:</strong> Al iniciar sesión por primera vez, debes cambiar tu contraseña.</p>
              <p>Accede en: <a href="http://localhost:5174">http://localhost:5174</a></p>
              <p>Saludos,<br>Equipo de Inventario Almo</p>
            </div>`);
            }
            catch (emailError) {
                console.error('Error sending invitation email:', emailError);
            }
        }
        res.status(201).json({
            success: true,
            data: {
                id: usuario.id,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol,
                activo: usuario.activo,
                createdAt: usuario.createdAt
            },
            invitacionEnviada: !!enviarInvitacion
        });
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'El email ya está registrado', code: 'DUPLICATE_EMAIL' });
        }
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al crear usuario', code: 'CREATE_ERROR' });
    }
});
// Update usuario
router.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, activo, password, rolIds } = req.body;
        const usuarioActual = await index_1.prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!usuarioActual) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado', code: 'NOT_FOUND' });
        }
        const updateData = {};
        if (nombre)
            updateData.nombre = nombre;
        if (typeof activo === 'boolean')
            updateData.activo = activo;
        if (password)
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        // Actualizar roles si se proporcionan
        if (rolIds !== undefined) {
            await index_1.prisma.usuarioRol.deleteMany({ where: { usuarioId: parseInt(id) } });
            if (rolIds.length > 0) {
                await index_1.prisma.usuarioRol.createMany({
                    data: rolIds.map((rolId) => ({ usuarioId: parseInt(id), rolId }))
                });
            }
        }
        const usuario = await index_1.prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json({
            success: true,
            data: {
                id: usuario.id,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol,
                activo: usuario.activo,
                createdAt: usuario.createdAt
            }
        });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al actualizar usuario', code: 'UPDATE_ERROR' });
    }
});
// Delete usuario
router.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (userId === parseInt(id)) {
            return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo', code: 'SELF_DELETE' });
        }
        await index_1.prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al eliminar usuario', code: 'DELETE_ERROR' });
    }
});
// ============================================
// OTROS
// ============================================
// Delete all servidores
router.delete('/servidores', async (req, res) => {
    try {
        await index_1.prisma.servidor.deleteMany({});
        res.json({ success: true, message: 'Todos los servidores eliminados' });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al eliminar servidores', code: 'DELETE_ERROR' });
    }
});
// ============================================
// AUDIT LOG
// ============================================
// Get all audit logs
router.get('/audit', async (req, res) => {
    try {
        const { page = '1', limit = '100' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [logs, total] = await Promise.all([
            index_1.prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            index_1.prisma.auditLog.count()
        ]);
        res.json({
            success: true,
            data: logs,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        logger_js_1.log.error('Error en admin', { error: error instanceof Error ? error.message : String(error), path: req.path });
        res.status(500).json({ success: false, message: 'Error al obtener audit log', code: 'FETCH_ERROR' });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Configuración de multer para uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'documentos');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|txt/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname || mimetype) {
            return cb(null, true);
        }
        cb(new Error('Tipo de archivo no permitido'));
    }
});
// GET - Obtener todos los documentos o filtrar por tipo
router.get('/', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { tipo, entidadId, entidadTipo } = req.query;
        const where = {};
        if (tipo)
            where.tipo = tipo;
        if (entidadId && entidadTipo) {
            if (entidadTipo === 'contrato')
                where.contratoId = parseInt(entidadId);
            if (entidadTipo === 'licencia')
                where.licenciaId = parseInt(entidadId);
            if (entidadTipo === 'servidor')
                where.servidorId = parseInt(entidadId);
        }
        const documentos = await prisma.documento.findMany({
            where,
            include: {
                contrato: { select: { id: true, tipo: true, numero: true } },
                licencia: { select: { id: true, nombre: true, tipo: true } },
                servidor: { select: { id: true, host: true, ip: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(documentos);
    }
    catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener documentos' });
    }
});
// GET - Obtener documento por ID
router.get('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const documento = await prisma.documento.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                contrato: { select: { id: true, tipo: true, numero: true } },
                licencia: { select: { id: true, nombre: true, tipo: true } },
                servidor: { select: { id: true, host: true, ip: true } }
            }
        });
        if (!documento) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        res.json(documento);
    }
    catch (error) {
        console.error('Error al obtener documento:', error);
        res.status(500).json({ error: 'Error al obtener documento' });
    }
});
// POST - Subir documento
router.post('/', auth_js_1.authMiddleware, upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }
        const { tipo, contratoId, licenciaId, servidorId, nombre } = req.body;
        const documento = await prisma.documento.create({
            data: {
                nombre: nombre || req.file.originalname,
                tipo: tipo || 'otro',
                url: `/uploads/documentos/${req.file.filename}`,
                mimeType: req.file.mimetype,
                tamano: req.file.size,
                contratoId: contratoId ? parseInt(contratoId) : null,
                licenciaId: licenciaId ? parseInt(licenciaId) : null,
                servidorId: servidorId ? parseInt(servidorId) : null
            }
        });
        res.status(201).json(documento);
    }
    catch (error) {
        console.error('Error al subir documento:', error);
        res.status(500).json({ error: 'Error al subir documento' });
    }
});
// DELETE - Eliminar documento
router.delete('/:id', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const documento = await prisma.documento.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!documento) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        // Eliminar archivo físico
        const filePath = path_1.default.join(process.cwd(), documento.url);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        await prisma.documento.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Documento eliminado correctamente' });
    }
    catch (error) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ error: 'Error al eliminar documento' });
    }
});
// GET - Descargar documento
router.get('/:id/download', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const documento = await prisma.documento.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!documento) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        const filePath = path_1.default.join(process.cwd(), documento.url);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
        }
        res.download(filePath, documento.nombre);
    }
    catch (error) {
        console.error('Error al descargar documento:', error);
        res.status(500).json({ error: 'Error al descargar documento' });
    }
});
exports.default = router;

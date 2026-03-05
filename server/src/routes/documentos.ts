import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Helper function to sanitize filename and prevent path traversal
function sanitizeFilename(originalName: string): string {
  // Remove any path components
  const basename = originalName.split('/').pop()?.split('\\').pop() || 'documento'
  // Get only safe extension
  const ext = path.extname(basename).toLowerCase().replace(/[^a-z0-9]/g, '')
  // Create safe name without extension, then add safe extension
  const nameWithoutExt = basename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50)
  return `${nameWithoutExt}${ext}`
}

// Configuración de multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documentos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize original filename to prevent path traversal
    const safeName = sanitizeFilename(file.originalname)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(safeName));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allowed extensions
    const allowedExtensions = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|txt/
    // Block dangerous extensions
    const blockedExtensions = /exe|sh|bat|cmd|ps1|js|jar|php|python|ruby|pl|cgi|html|htm|svg/
    
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    const extname = allowedExtensions.test(ext)
    const isBlocked = blockedExtensions.test(ext)
    
    // Check mimetype
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain'
    ]
    const mimetype = allowedMimes.includes(file.mimetype)
    
    if (extname && !isBlocked && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Tipo de archivo no permitido'))
  }
});

// GET - Obtener todos los documentos o filtrar por tipo
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { tipo, entidadId, entidadTipo } = req.query;
    const where: any = {};

    if (tipo) where.tipo = tipo as string;
    if (entidadId && entidadTipo) {
      if (entidadTipo === 'contrato') where.contratoId = parseInt(entidadId as string);
      if (entidadTipo === 'licencia') where.licenciaId = parseInt(entidadId as string);
      if (entidadTipo === 'servidor') where.servidorId = parseInt(entidadId as string);
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
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// GET - Obtener documento por ID
router.get('/:id', authMiddleware, async (req, res) => {
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
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// POST - Subir documento
router.post('/', authMiddleware, upload.single('archivo'), async (req, res) => {
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
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: 'Error al subir documento' });
  }
});

// DELETE - Eliminar documento
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const documento = await prisma.documento.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Eliminar archivo físico
    const filePath = path.join(process.cwd(), documento.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.documento.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// GET - Descargar documento
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const documento = await prisma.documento.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const filePath = path.join(process.cwd(), documento.url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    res.download(filePath, documento.nombre);
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({ error: 'Error al descargar documento' });
  }
});

export default router;

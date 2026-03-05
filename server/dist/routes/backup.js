"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const router = (0, express_1.Router)();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
router.use(auth_1.authMiddleware);
router.use(auth_1.requireAdmin);
// Get backup list
router.get('/backups', async (req, res) => {
    try {
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        let backups = [];
        if (fs_1.default.existsSync(backupDir)) {
            const files = fs_1.default.readdirSync(backupDir);
            const dbFiles = files.filter(f => f.endsWith('.db.gz'));
            backups = dbFiles.map(file => {
                const filePath = path_1.default.join(backupDir, file);
                const stats = fs_1.default.statSync(filePath);
                const jsonFile = file.replace('.db.gz', '.json');
                const jsonPath = path_1.default.join(backupDir, jsonFile);
                let metadata = {};
                if (fs_1.default.existsSync(jsonPath)) {
                    try {
                        metadata = JSON.parse(fs_1.default.readFileSync(jsonPath, 'utf-8'));
                    }
                    catch (e) { }
                }
                return {
                    name: file,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    createdAt: metadata.date || stats.mtime,
                    path: filePath
                };
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        res.json({ success: true, data: backups });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al listar backups', code: 'FETCH_ERROR' });
    }
});
// Create backup
router.post('/backups', async (req, res) => {
    try {
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/prisma/dev.db';
        // Create backup directory
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `inventario_almo_${date}`;
        const backupPath = path_1.default.join(backupDir, `${backupName}.db`);
        const backupGzPath = `${backupPath}.gz`;
        // Copy database
        fs_1.default.copyFileSync(dbPath, backupPath);
        // Compress
        await execAsync(`gzip -k "${backupPath}"`);
        // Create metadata
        const metadata = {
            name: backupName,
            date: new Date().toISOString(),
            size_bytes: fs_1.default.statSync(backupGzPath).size,
            database_path: dbPath,
            createdBy: req.user?.email || 'system'
        };
        fs_1.default.writeFileSync(path_1.default.join(backupDir, `${backupName}.json`), JSON.stringify(metadata, null, 2));
        // Create checksum
        const checksum = await execAsync(`sha256sum "${backupGzPath}"`);
        fs_1.default.writeFileSync(path_1.default.join(backupDir, `${backupName}.sha256`), checksum.stdout);
        res.json({
            success: true,
            message: 'Backup creado correctamente',
            data: { name: `${backupName}.db.gz`, size: metadata.size_bytes }
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear backup', code: 'CREATE_ERROR' });
    }
});
// Download backup
router.get('/backups/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        // Sanitize filename to prevent path traversal
        const safeFilename = sanitizeFilename(filename);
        if (!safeFilename || !safeFilename.endsWith('.db.gz')) {
            return res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
        }
        const filePath = path_1.default.join(backupDir, safeFilename);
        // Verify the resolved path is within backupDir (prevent path traversal)
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedBackupDir = path_1.default.resolve(backupDir);
        if (!resolvedPath.startsWith(resolvedBackupDir)) {
            return res.status(400).json({ success: false, message: 'Ruta no permitida' });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Backup no encontrado' });
        }
        res.download(filePath, safeFilename);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al descargar backup', code: 'DOWNLOAD_ERROR' });
    }
});
// Restore backup
router.post('/backups/restore', async (req, res) => {
    try {
        const { filename } = req.body;
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/prisma/dev.db';
        // Sanitize filename to prevent path traversal
        const safeFilename = sanitizeFilename(filename);
        if (!safeFilename || !safeFilename.endsWith('.db.gz')) {
            return res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
        }
        const backupPath = path_1.default.join(backupDir, safeFilename);
        // Verify the resolved path is within backupDir (prevent path traversal)
        const resolvedPath = path_1.default.resolve(backupPath);
        const resolvedBackupDir = path_1.default.resolve(backupDir);
        if (!resolvedPath.startsWith(resolvedBackupDir)) {
            return res.status(400).json({ success: false, message: 'Ruta no permitida' });
        }
        if (!fs_1.default.existsSync(backupPath)) {
            return res.status(404).json({ success: false, message: 'Backup no encontrado' });
        }
        // Verify checksum if exists
        const checksumFile = backupPath.replace('.db.gz', '.sha256');
        if (fs_1.default.existsSync(checksumFile)) {
            const expectedChecksum = fs_1.default.readFileSync(checksumFile, 'utf-8').trim().split(' ')[0];
            const { stdout } = await execAsync(`sha256sum "${backupPath}"`);
            const actualChecksum = stdout.trim().split(' ')[0];
            if (expectedChecksum !== actualChecksum) {
                return res.status(400).json({ success: false, message: 'El archivo está corrupto (checksum no coincide)' });
            }
        }
        // Decompress
        const tempPath = path_1.default.join(backupDir, 'temp_restore.db');
        await execAsync(`gunzip -c "${backupPath}" > "${tempPath}"`);
        // Stop server (in production would need to handle this)
        // For now, just copy
        fs_1.default.copyFileSync(tempPath, dbPath);
        fs_1.default.unlinkSync(tempPath);
        res.json({ success: true, message: 'Backup restaurado correctamente. Por favor reinicie la aplicación.' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al restaurar backup', code: 'RESTORE_ERROR' });
    }
});
// Delete backup
router.delete('/backups/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = process.env.BACKUP_DIR || '/app/backups';
        // Sanitize filename to prevent path traversal
        const safeFilename = sanitizeFilename(filename);
        if (!safeFilename || !safeFilename.endsWith('.db.gz')) {
            return res.status(400).json({ success: false, message: 'Nombre de archivo inválido' });
        }
        const baseName = safeFilename.replace('.db.gz', '');
        const filePath = path_1.default.join(backupDir, safeFilename);
        // Verify the resolved path is within backupDir (prevent path traversal)
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedBackupDir = path_1.default.resolve(backupDir);
        if (!resolvedPath.startsWith(resolvedBackupDir)) {
            return res.status(400).json({ success: false, message: 'Ruta no permitida' });
        }
        // Delete main file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Delete metadata
        const jsonPath = path_1.default.join(backupDir, `${baseName}.json`);
        if (fs_1.default.existsSync(jsonPath)) {
            fs_1.default.unlinkSync(jsonPath);
        }
        // Delete checksum
        const shaPath = path_1.default.join(backupDir, `${baseName}.sha256`);
        if (fs_1.default.existsSync(shaPath)) {
            fs_1.default.unlinkSync(shaPath);
        }
        res.json({ success: true, message: 'Backup eliminado correctamente' });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar backup', code: 'DELETE_ERROR' });
    }
});
// Helper function to sanitize filename and prevent path traversal
function sanitizeFilename(filename) {
    // Remove any path components
    const basename = filename.split('/').pop()?.split('\\').pop() || '';
    // Only allow safe characters
    return basename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
}
// Helper function
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
exports.default = router;

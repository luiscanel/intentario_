import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware, requireAdmin } from '../middleware/auth'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const router = Router()
const execAsync = promisify(exec)

router.use(authMiddleware)
router.use(requireAdmin)

// Get backup list
router.get('/backups', async (req, res) => {
  try {
    const backupDir = process.env.BACKUP_DIR || '/app/backups'
    
    let backups: any[] = []
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
      const dbFiles = files.filter(f => f.endsWith('.db.gz'))
      
      backups = dbFiles.map(file => {
        const filePath = path.join(backupDir, file)
        const stats = fs.statSync(filePath)
        const jsonFile = file.replace('.db.gz', '.json')
        const jsonPath = path.join(backupDir, jsonFile)
        
        let metadata: any = {}
        if (fs.existsSync(jsonPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
          } catch (e) {}
        }
        
        return {
          name: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: metadata.date || stats.mtime,
          path: filePath
        }
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    
    res.json({ success: true, data: backups })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al listar backups', code: 'FETCH_ERROR' })
  }
})

// Create backup
router.post('/backups', async (req, res) => {
  try {
    const backupDir = process.env.BACKUP_DIR || '/app/backups'
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/prisma/dev.db'
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `inventario_almo_${date}`
    const backupPath = path.join(backupDir, `${backupName}.db`)
    const backupGzPath = `${backupPath}.gz`
    
    // Copy database
    fs.copyFileSync(dbPath, backupPath)
    
    // Compress
    await execAsync(`gzip -k "${backupPath}"`)
    
    // Create metadata
    const metadata = {
      name: backupName,
      date: new Date().toISOString(),
      size_bytes: fs.statSync(backupGzPath).size,
      database_path: dbPath,
      createdBy: (req as any).user?.email || 'system'
    }
    
    fs.writeFileSync(
      path.join(backupDir, `${backupName}.json`),
      JSON.stringify(metadata, null, 2)
    )
    
    // Create checksum
    const checksum = await execAsync(`sha256sum "${backupGzPath}"`)
    fs.writeFileSync(
      path.join(backupDir, `${backupName}.sha256`),
      checksum.stdout
    )
    
    res.json({ 
      success: true, 
      message: 'Backup creado correctamente',
      data: { name: `${backupName}.db.gz`, size: metadata.size_bytes }
    })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear backup', code: 'CREATE_ERROR' })
  }
})

// Download backup
router.get('/backups/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const backupDir = process.env.BACKUP_DIR || '/app/backups'
    const filePath = path.join(backupDir, filename)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup no encontrado' })
    }
    
    res.download(filePath, filename)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al descargar backup', code: 'DOWNLOAD_ERROR' })
  }
})

// Restore backup
router.post('/backups/restore', async (req, res) => {
  try {
    const { filename } = req.body
    const backupDir = process.env.BACKUP_DIR || '/app/backups'
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/app/prisma/dev.db'
    const backupPath = path.join(backupDir, filename)
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, message: 'Backup no encontrado' })
    }
    
    // Verify checksum if exists
    const checksumFile = backupPath.replace('.db.gz', '.sha256')
    if (fs.existsSync(checksumFile)) {
      const expectedChecksum = fs.readFileSync(checksumFile, 'utf-8').trim().split(' ')[0]
      const { stdout } = await execAsync(`sha256sum "${backupPath}"`)
      const actualChecksum = stdout.trim().split(' ')[0]
      
      if (expectedChecksum !== actualChecksum) {
        return res.status(400).json({ success: false, message: 'El archivo está corrupto (checksum no coincide)' })
      }
    }
    
    // Decompress
    const tempPath = path.join(backupDir, 'temp_restore.db')
    await execAsync(`gunzip -c "${backupPath}" > "${tempPath}"`)
    
    // Stop server (in production would need to handle this)
    // For now, just copy
    fs.copyFileSync(tempPath, dbPath)
    fs.unlinkSync(tempPath)
    
    res.json({ success: true, message: 'Backup restaurado correctamente. Por favor reinicie la aplicación.' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al restaurar backup', code: 'RESTORE_ERROR' })
  }
})

// Delete backup
router.delete('/backups/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const backupDir = process.env.BACKUP_DIR || '/app/backups'
    const baseName = filename.replace('.db.gz', '')
    
    // Delete main file
    const filePath = path.join(backupDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    
    // Delete metadata
    const jsonPath = path.join(backupDir, `${baseName}.json`)
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath)
    }
    
    // Delete checksum
    const shaPath = path.join(backupDir, `${baseName}.sha256`)
    if (fs.existsSync(shaPath)) {
      fs.unlinkSync(shaPath)
    }
    
    res.json({ success: true, message: 'Backup eliminado correctamente' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar backup', code: 'DELETE_ERROR' })
  }
})

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default router

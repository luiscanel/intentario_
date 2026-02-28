import { Router } from 'express'
import { prisma } from '../prisma/index'
import { authMiddleware } from '../middleware/auth'
import { 
  getEmailConfig,
  sendReportByEmail,
  generateVMReport,
  generatePhysicalReport,
  generateExecutiveSummary
} from '../services/reportsService'

const router = Router()

router.use(authMiddleware)

// Obtener configuración de email
router.get('/config', async (req, res) => {
  try {
    const config = await prisma.emailConfig.findFirst({
      where: { activo: true }
    })
    if (config) {
      res.json({ ...config, contrasena: '••••••••' })
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Error al obtener configuración' })
  }
})

// Guardar configuración de email
router.post('/config', async (req, res) => {
  try {
    const { host, puerto, usuario, contrasena, usandoTls, emailFrom, activo } = req.body

    await prisma.emailConfig.updateMany({
      where: { activo: true },
      data: { activo: false }
    })

    const config = await prisma.emailConfig.create({
      data: {
        host,
        puerto: puerto || 587,
        usuario,
        contrasena,
        usandoTls: usandoTls !== false,
        emailFrom,
        activo: activo !== false
      }
    })

    res.json({ ...config, contrasena: '••••••••' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Error al guardar configuración' })
  }
})

// Probar configuración de email
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body
    
    const config = await getEmailConfig()
    if (!config) {
      return res.status(400).json({ message: 'No hay configuración de email' })
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.puerto,
      secure: !config.usandoTls,
      auth: {
        user: config.usuario,
        pass: config.contrasena
      }
    })

    await transporter.sendMail({
      from: config.emailFrom,
      to: email,
      subject: 'Test - Sistema de Inventario Almo',
      html: '<p>Configuración de email correcta ✅</p>'
    })

    res.json({ success: true, message: 'Email de prueba enviado' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Generar informe de VMs
router.post('/generate-vm', async (req, res) => {
  try {
    const { tipo, filtro } = req.body
    
    const servidores = await prisma.servidor.findMany()
    const data = generateVMReport(servidores, tipo, filtro)
    
    res.json({ data, total: data.length })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Error al generar informe' })
  }
})

// Generar informe de Inventario Físico
router.post('/generate-physical', async (req, res) => {
  try {
    const { tipo, filtro } = req.body
    
    const equipos = await prisma.inventarioFisico.findMany()
    const data = generatePhysicalReport(equipos, tipo, filtro)
    
    res.json({ data, total: data.length })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Error al generar informe' })
  }
})

// Generar resumen ejecutivo
router.get('/summary', async (req, res) => {
  try {
    const servidores = await prisma.servidor.findMany()
    const equiposFisicos = await prisma.inventarioFisico.findMany()
    
    const summary = generateExecutiveSummary(servidores, equiposFisicos)
    
    res.json(summary)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Error al generar resumen' })
  }
})

// Enviar informe por email
router.post('/send-report', async (req, res) => {
  try {
    const { email, tipo, filtro, tipoReporte, titulo } = req.body
    
    let data: any[]
    let filename: string

    if (tipoReporte === 'vm') {
      const servidores = await prisma.servidor.findMany()
      data = generateVMReport(servidores, filtro, tipo)
      filename = `informe_vms_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`
    } else if (tipoReporte === 'physical') {
      const equipos = await prisma.inventarioFisico.findMany()
      data = generatePhysicalReport(equipos, filtro, tipo)
      filename = `informe_equipos_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`
    } else {
      return res.status(400).json({ message: 'Tipo de reporte no válido' })
    }

    await sendReportByEmail(email, data, titulo, filename)
    
    res.json({ success: true, message: 'Informe enviado correctamente' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router

import nodemailer from 'nodemailer'
import { prisma } from '../prisma/index'

export interface EmailConfig {
  host: string
  puerto: number
  usuario: string
  contrasena: string
  usandoTls: boolean
  emailFrom: string
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const config = await prisma.emailConfig.findFirst({
    where: { activo: true }
  })
  if (!config) return null
  
  return {
    host: config.host,
    puerto: config.puerto,
    usuario: config.usuario,
    contrasena: config.contrasena,
    usandoTls: config.usandoTls,
    emailFrom: config.emailFrom
  }
}

export async function sendEmail(to: string, subject: string, html: string) {
  const config = await getEmailConfig()
  
  if (!config) {
    throw new Error('Configuración de email no encontrada')
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.puerto,
    secure: !config.usandoTls,
    auth: {
      user: config.usuario,
      pass: config.contrasena
    },
    tls: config.usandoTls ? {
      rejectUnauthorized: false
    } : undefined
  })

  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html
  })
}

export async function sendInventoryReport(to: string, servidores: any[]) {
  const html = `
    <h1>Inventario de Servidores - Grupo Almo</h1>
    <p>Total de servidores: ${servidores.length}</p>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr style="background: #f0f0f0;">
        <th>Host</th>
        <th>IP</th>
        <th>Ambiente</th>
        <th>Estado</th>
        <th>Responsable</th>
      </tr>
      ${servidores.map(s => `
        <tr>
          <td>${s.host}</td>
          <td>${s.ip}</td>
          <td>${s.ambiente}</td>
          <td>${s.estado}</td>
          <td>${s.responsable || '-'}</td>
        </tr>
      `).join('')}
    </table>
    <p style="color: #666; font-size: 12px;">
      Este es un informe automático del sistema de inventario de servidores.
    </p>
  `

  await sendEmail(to, 'Inventario de Servidores - Grupo Almo', html)
}

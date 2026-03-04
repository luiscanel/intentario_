"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailConfig = getEmailConfig;
exports.sendEmail = sendEmail;
exports.sendInventoryReport = sendInventoryReport;
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_1 = require("../prisma/index");
async function getEmailConfig() {
    const config = await index_1.prisma.emailConfig.findFirst({
        where: { activo: true }
    });
    if (!config)
        return null;
    return {
        host: config.host,
        puerto: config.puerto,
        usuario: config.usuario,
        contrasena: config.contrasena,
        usandoTls: config.usandoTls,
        emailFrom: config.emailFrom
    };
}
async function sendEmail(to, subject, html) {
    const config = await getEmailConfig();
    if (!config) {
        throw new Error('Configuración de email no encontrada');
    }
    const transporter = nodemailer_1.default.createTransport({
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
    });
    await transporter.sendMail({
        from: config.emailFrom,
        to,
        subject,
        html
    });
}
async function sendInventoryReport(to, servidores) {
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
  `;
    await sendEmail(to, 'Inventario de Servidores - Grupo Almo', html);
}

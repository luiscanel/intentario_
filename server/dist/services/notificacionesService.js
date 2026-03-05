"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScheduledChecks = runScheduledChecks;
exports.checkAllMonitoredServices = checkAllMonitoredServices;
exports.startNotificationService = startNotificationService;
exports.stopNotificationService = stopNotificationService;
const index_js_1 = require("../prisma/index.js");
const email_js_1 = require("./email.js");
const monitorService_js_1 = require("./monitorService.js");
// Intervalo de verificación (en milisegundos) - cada hora
const CHECK_INTERVAL = 60 * 60 * 1000;
// Días de anticipación para alertas
const DIAS_VENCIMIENTO_CONTRATO = 30;
const DIAS_VENCIMIENTO_LICENCIA = 30;
const DIAS_VENCIMIENTO_SSL = 30;
// Función principal de verificación
async function runScheduledChecks() {
    console.log('🔔 Iniciando verificación programada...');
    try {
        await Promise.all([
            checkContratosPorVencer(),
            checkLicenciasPorVencer(),
            checkCertificadosPorVencer(),
            checkServidoresCaidos()
        ]);
        console.log('✅ Verificación completada');
    }
    catch (error) {
        console.error('❌ Error en verificación programada:', error);
    }
}
// Verificar contratos por vencer
async function checkContratosPorVencer() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_VENCIMIENTO_CONTRATO);
    const contratos = await index_js_1.prisma.contrato.findMany({
        where: {
            estado: 'Activo',
            fechaFin: {
                gte: new Date(),
                lte: fechaLimite
            }
        },
        include: { proveedor: true }
    });
    if (contratos.length === 0)
        return;
    // Obtener configuración de email
    const emailConfig = await index_js_1.prisma.emailConfig.findFirst({
        where: { activo: true }
    });
    if (!emailConfig || !emailConfig.usuario) {
        console.log('⚠️ No hay configuración de email, saltando notificaciones de contratos');
        return;
    }
    // Enviar notificación
    let mensaje = 'Los siguientes contratos vencen pronto:<br><br>';
    for (const contrato of contratos) {
        const diasRestantes = Math.ceil((contrato.fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        mensaje += `📄 ${contrato.proveedor?.nombre || 'Sin proveedor'} - ${contrato.numero || contrato.id}: Vence en ${diasRestantes} días (${contrato.fechaFin?.toLocaleDateString()})<br>`;
    }
    try {
        await (0, email_js_1.sendEmail)(emailConfig.usuario, `⚠️ Alerta: ${contratos.length} contrato(s) por vencer`, mensaje);
        // Crear alertas en el sistema
        for (const contrato of contratos) {
            const diasRestantes = Math.ceil((contrato.fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            await index_js_1.prisma.alerta.create({
                data: {
                    tipo: 'warning',
                    titulo: `Contrato por vencer: ${contrato.numero || contrato.id}`,
                    mensaje: `Vence en ${diasRestantes} días (${contrato.fechaFin?.toLocaleDateString()})`,
                    entidad: 'Contrato',
                    entidadId: contrato.id
                }
            });
        }
        console.log(`📧 Notificación de contratos enviada: ${contratos.length} contratos`);
    }
    catch (error) {
        console.error('Error enviando notificación de contratos:', error);
    }
}
// Verificar licencias por vencer
async function checkLicenciasPorVencer() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_VENCIMIENTO_LICENCIA);
    const licencias = await index_js_1.prisma.licencia.findMany({
        where: {
            activa: true,
            fechaVencimiento: {
                gte: new Date(),
                lte: fechaLimite
            }
        },
        include: { proveedor: true }
    });
    if (licencias.length === 0)
        return;
    const emailConfig = await index_js_1.prisma.emailConfig.findFirst({
        where: { activo: true }
    });
    if (!emailConfig || !emailConfig.usuario)
        return;
    let mensaje = 'Las siguientes licencias vencen pronto:<br><br>';
    for (const licencia of licencias) {
        const diasRestantes = Math.ceil((licencia.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        mensaje += `🔑 ${licencia.nombre}: Vence en ${diasRestantes} días (${licencia.fechaVencimiento?.toLocaleDateString()})<br>`;
    }
    try {
        await (0, email_js_1.sendEmail)(emailConfig.usuario, `⚠️ Alerta: ${licencias.length} licencia(s) por vencer`, mensaje);
        for (const licencia of licencias) {
            const diasRestantes = Math.ceil((licencia.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            await index_js_1.prisma.alerta.create({
                data: {
                    tipo: 'warning',
                    titulo: `Licencia por vencer: ${licencia.nombre}`,
                    mensaje: `Vence en ${diasRestantes} días (${licencia.fechaVencimiento?.toLocaleDateString()})`,
                    entidad: 'Licencia',
                    entidadId: licencia.id
                }
            });
        }
        console.log(`📧 Notificación de licencias enviada: ${licencias.length} licencias`);
    }
    catch (error) {
        console.error('Error enviando notificación de licencias:', error);
    }
}
// Verificar certificados SSL por vencer
async function checkCertificadosPorVencer() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_VENCIMIENTO_SSL);
    const certificados = await index_js_1.prisma.certificadoSSL.findMany({
        where: {
            activo: true,
            fechaVencimiento: {
                gte: new Date(),
                lte: fechaLimite
            }
        },
        include: { proveedor: true, servidor: true }
    });
    if (certificados.length === 0)
        return;
    const emailConfig = await index_js_1.prisma.emailConfig.findFirst({
        where: { activo: true }
    });
    if (!emailConfig || !emailConfig.usuario)
        return;
    let mensaje = 'Los siguientes certificados SSL vencen pronto:<br><br>';
    for (const cert of certificados) {
        const diasRestantes = Math.ceil((cert.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        mensaje += `🔒 ${cert.dominio}: Vence en ${diasRestantes} días (${cert.fechaVencimiento.toLocaleDateString()})<br>`;
        if (cert.servidor) {
            mensaje += `&nbsp;&nbsp;&nbsp;Servidor: ${cert.servidor.host || cert.servidor.ip}<br>`;
        }
    }
    try {
        await (0, email_js_1.sendEmail)(emailConfig.usuario, `🔒 Alerta: ${certificados.length} certificado(s) SSL por vencer`, mensaje);
        for (const cert of certificados) {
            const diasRestantes = Math.ceil((cert.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            await index_js_1.prisma.alerta.create({
                data: {
                    tipo: 'warning',
                    titulo: `Certificado SSL por vencer: ${cert.dominio}`,
                    mensaje: `Vence en ${diasRestantes} días (${cert.fechaVencimiento.toLocaleDateString()})`,
                    entidad: 'CertificadoSSL',
                    entidadId: cert.id
                }
            });
        }
        console.log(`📧 Notificación de certificados SSL enviada: ${certificados.length} certificados`);
    }
    catch (error) {
        console.error('Error enviando notificación de certificados:', error);
    }
}
// Verificar servidores caídos
async function checkServidoresCaidos() {
    const servicios = await index_js_1.prisma.disponibilidad.findMany({
        where: { status: 'offline' }
    });
    if (servicios.length === 0)
        return;
    const emailConfig = await index_js_1.prisma.emailConfig.findFirst({
        where: { activo: true }
    });
    if (!emailConfig || !emailConfig.usuario)
        return;
    let mensaje = 'Los siguientes servicios están caídos:<br><br>';
    for (const servicio of servicios) {
        mensaje += `❌ ${servicio.nombre || servicio.ip}: ${servicio.ip}<br>`;
        mensaje += `&nbsp;&nbsp;&nbsp;Última verificación: ${servicio.ultimoCheck?.toLocaleString()}<br><br>`;
    }
    try {
        await (0, email_js_1.sendEmail)(emailConfig.usuario, `🚨 Alerta: ${servicios.length} servicio(s) caídos`, mensaje);
        // Crear alertas solo si no existe una reciente
        for (const servicio of servicios) {
            const alertaReciente = await index_js_1.prisma.alerta.findFirst({
                where: {
                    entidad: 'Disponibilidad',
                    entidadId: servicio.id,
                    createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Última hora
                }
            });
            if (!alertaReciente) {
                await index_js_1.prisma.alerta.create({
                    data: {
                        tipo: 'critical',
                        titulo: `Servicio caído: ${servicio.nombre}`,
                        mensaje: `El servicio en ${servicio.ip} no responde`,
                        entidad: 'Disponibilidad',
                        entidadId: servicio.id
                    }
                });
            }
        }
        console.log(`📧 Notificación de servicios caídos enviada: ${servicios.length} servicios`);
    }
    catch (error) {
        console.error('Error enviando notificación de servidores caídos:', error);
    }
}
// Verificación de monitoreo de servicios (verificar todos los servicios monitoreados)
async function checkAllMonitoredServices() {
    console.log('🔄 Verificando servicios monitoreados...');
    const servicios = await index_js_1.prisma.disponibilidad.findMany();
    for (const servicio of servicios) {
        try {
            const tipo = servicio.nombre?.toLowerCase() || 'http';
            const puerto = servicio.ip.includes(':') ? parseInt(servicio.ip.split(':')[1]) : 80;
            const resultado = await (0, monitorService_js_1.checkService)(servicio.ip, tipo, puerto);
            await index_js_1.prisma.disponibilidad.update({
                where: { id: servicio.id },
                data: {
                    status: resultado.status,
                    latency: resultado.latency || null,
                    ultimoCheck: new Date()
                }
            });
            await index_js_1.prisma.historialDisponibilidad.create({
                data: {
                    ip: servicio.ip,
                    status: resultado.status,
                    latency: resultado.latency
                }
            });
            // Crear alerta si está offline
            if (resultado.status === 'offline') {
                const alertaReciente = await index_js_1.prisma.alerta.findFirst({
                    where: {
                        entidad: 'Disponibilidad',
                        entidadId: servicio.id,
                        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
                    }
                });
                if (!alertaReciente) {
                    await index_js_1.prisma.alerta.create({
                        data: {
                            tipo: 'error',
                            titulo: `Servicio caído: ${servicio.nombre}`,
                            mensaje: `El servicio en ${servicio.ip} no responde. ${resultado.message || ''}`,
                            entidad: 'Disponibilidad',
                            entidadId: servicio.id
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error verificando servicio ${servicio.ip}:`, error);
        }
    }
    console.log(`✅ Verificación de servicios completada: ${servicios.length} servicios`);
}
// Iniciar el servicio de notificaciones
let intervalId = null;
function startNotificationService() {
    if (intervalId) {
        console.log('⚠️ El servicio de notificaciones ya está corriendo');
        return;
    }
    console.log('🔔 Servicio de notificaciones iniciado');
    // Ejecutar inmediatamente al iniciar
    runScheduledChecks();
    checkAllMonitoredServices();
    // Luego ejecutar cada hora
    intervalId = setInterval(() => {
        runScheduledChecks();
        checkAllMonitoredServices();
    }, CHECK_INTERVAL);
}
function stopNotificationService() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('🔔 Servicio de notificaciones detenido');
    }
}

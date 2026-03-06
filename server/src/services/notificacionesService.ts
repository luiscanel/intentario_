import { prisma } from '../prisma/index.js'
import { sendEmail } from './email.js'
import { checkService } from './monitorService.js'

const CHECK_INTERVAL = 60 * 60 * 1000

async function getConfigAlerta(tipo: string) {
  return await prisma.configAlerta.findUnique({ where: { tipo } })
}

export async function runScheduledChecks() {
  console.log('🔔 Iniciando verificación programada...')
  try {
    await Promise.all([
      checkContratosPorVencer(),
      checkLicenciasPorVencer(),
      checkCertificadosPorVencer(),
      checkServidoresCaidos()
    ])
    console.log('✅ Verificación completada')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function checkContratosPorVencer() {
  const config = await getConfigAlerta('contrato_vencer')
  if (!config || !config.activo) return
  
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() + config.diasAntelacion)
  
  const contratos = await prisma.contrato.findMany({
    where: { estado: 'Activo', fechaFin: { gte: new Date(), lte: fechaLimite } },
    include: { proveedor: true }
  })
  
  if (contratos.length === 0) return
  
  const emailConfig = await prisma.emailConfig.findFirst({ where: { activo: true } })
  if (!emailConfig?.usuario) return
  
  let mensaje = `Los siguientes contratos vencen en ${config.diasAntelacion} días:<br><br>`
  for (const c of contratos) {
    const dias = Math.ceil((c.fechaFin!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    mensaje += `📄 ${c.proveedor?.nombre || 'Sin proveedor'}: Vence en ${dias} días<br>`
  }
  
  if (config.enviarEmail) {
    await sendEmail(emailConfig.usuario, `⚠️ ${contratos.length} contrato(s) por vencer`, mensaje)
  }
  
  if (config.crearAlerta) {
    for (const c of contratos) {
      const dias = Math.ceil((c.fechaFin!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      await prisma.alerta.create({
        data: { tipo: 'warning', titulo: `Contrato por vencer`, mensaje: `Vence en ${dias} días`, entidad: 'Contrato', entidadId: c.id }
      })
    }
  }
}

async function checkLicenciasPorVencer() {
  const config = await getConfigAlerta('licencia_vencer')
  if (!config || !config.activo) return
  
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() + config.diasAntelacion)
  
  const licencias = await prisma.licencia.findMany({
    where: { activa: true, fechaVencimiento: { gte: new Date(), lte: fechaLimite } },
    include: { proveedor: true }
  })
  
  if (licencias.length === 0) return
  
  const emailConfig = await prisma.emailConfig.findFirst({ where: { activo: true } })
  if (!emailConfig?.usuario) return
  
  let mensaje = `Las siguientes licencias vencen en ${config.diasAntelacion} días:<br><br>`
  for (const l of licencias) {
    const dias = Math.ceil((l.fechaVencimiento!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    mensaje += `🔑 ${l.nombre}: Vence en ${dias} días<br>`
  }
  
  if (config.enviarEmail) {
    await sendEmail(emailConfig.usuario, `⚠️ ${licencias.length} licencia(s) por vencer`, mensaje)
  }
}

async function checkCertificadosPorVencer() {
  const config = await getConfigAlerta('certificado_vencer')
  if (!config || !config.activo) return
  
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() + config.diasAntelacion)
  
  const certificados = await prisma.certificadoSSL.findMany({
    where: { activo: true, fechaVencimiento: { gte: new Date(), lte: fechaLimite } }
  })
  
  if (certificados.length === 0) return
  
  const emailConfig = await prisma.emailConfig.findFirst({ where: { activo: true } })
  if (!emailConfig?.usuario) return
  
  let mensaje = `Los siguientes certificados SSL vencen en ${config.diasAntelacion} días:<br><br>`
  for (const c of certificados) {
    const dias = Math.ceil((c.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    mensaje += `🔒 ${c.dominio}: Vence en ${dias} días<br>`
  }
  
  if (config.enviarEmail) {
    await sendEmail(emailConfig.usuario, `🔒 ${certificados.length} certificado(s) SSL por vencer`, mensaje)
  }
}

async function checkServidoresCaidos() {
  const config = await getConfigAlerta('servidor_caido')
  if (!config || !config.activo) return
  
  const servicios = await prisma.disponibilidad.findMany({ where: { status: 'offline' } })
  if (servicios.length === 0) return
  
  const emailConfig = await prisma.emailConfig.findFirst({ where: { activo: true } })
  if (!emailConfig?.usuario) return
  
  let mensaje = `Los siguientes servicios están caídos:<br><br>`
  for (const s of servicios) {
    mensaje += `❌ ${s.nombre}: ${s.ip}<br>`
  }
  
  if (config.enviarEmail) {
    await sendEmail(emailConfig.usuario, `🚨 ${servicios.length} servicio(s) caídos`, mensaje)
  }
}

export async function checkAllMonitoredServices() {
  console.log('🔄 Verificando servicios...')
  const servicios = await prisma.disponibilidad.findMany()
  
  for (const s of servicios) {
    try {
      const resultado = await checkService(s.ip, 'http', 80)
      await prisma.disponibilidad.update({
        where: { id: s.id },
        data: { status: resultado.status, latency: resultado.latency || null, ultimoCheck: new Date() }
      })
      await prisma.historialDisponibilidad.create({
        data: { ip: s.ip, status: resultado.status, latency: resultado.latency }
      })
    } catch (error) {
      console.error(`Error: ${s.ip}`, error)
    }
  }
}

export async function initConfigAlertas() {
  const configs = [
    { tipo: 'servidor_caido', nombre: 'Servidor Caído', diasAntelacion: 0 },
    { tipo: 'contrato_vencer', nombre: 'Contrato por Vencer', diasAntelacion: 30 },
    { tipo: 'licencia_vencer', nombre: 'Licencia por Vencer', diasAntelacion: 30 },
    { tipo: 'certificado_vencer', nombre: 'Certificado SSL por Vencer', diasAntelacion: 30 }
  ]
  
  for (const c of configs) {
    const existing = await prisma.configAlerta.findUnique({ where: { tipo: c.tipo } })
    if (!existing) {
      await prisma.configAlerta.create({ data: c })
      console.log(`✅ Configuración creada: ${c.nombre}`)
    }
  }
}

let intervalId: NodeJS.Timeout | null = null

export function startNotificationService() {
  if (intervalId) return
  console.log('🔔 Servicio de notificaciones iniciado')
  initConfigAlertas()
  runScheduledChecks()
  checkAllMonitoredServices()
  intervalId = setInterval(() => { runScheduledChecks(); checkAllMonitoredServices(); }, CHECK_INTERVAL)
}

export function stopNotificationService() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}

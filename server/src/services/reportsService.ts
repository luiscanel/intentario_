import { prisma } from '../prisma/index'
import nodemailer from 'nodemailer'
import * as XLSX from 'xlsx'

// Utilidad para parsear números
function parseToNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^\d.]/g, ''))
    return isNaN(num) ? 0 : num
  }
  return 0
}

// Generar datos para informe de VMs
export function generateVMReport(servidores: any[], tipo: string, filtro?: string) {
  let data = [...servidores]

  // Aplicar filtros
  if (filtro) {
    switch (tipo) {
      case 'ambiente':
        data = data.filter(s => s.ambiente === filtro)
        break
      case 'pais':
        data = data.filter(s => s.pais === filtro)
        break
      case 'estado':
        data = data.filter(s => s.estado === filtro)
        break
      case 'sin-antivirus':
        data = data.filter(s => !s.antivirus?.trim())
        break
      case 'produccion':
        data = data.filter(s => s.ambiente === 'PRODUCCION')
        break
    }
  }

  return data.map(s => ({
    'País': s.pais,
    'Host': s.host,
    'Nombre VM': s.nombreVM,
    'IP': s.ip,
    'CPU': parseToNumber(s.cpu),
    'Memoria (GB)': parseToNumber(s.memoria),
    'Disco (GB)': parseToNumber(s.disco),
    'Ambiente': s.ambiente,
    'Arquitectura': s.arquitectura,
    'Sistema Operativo': s.sistemaOperativo,
    'Versión O.S': s.version,
    'Antivirus': s.antivirus || 'No especificado',
    'Estado': s.estado,
    'Responsable': s.responsable,
    'Fecha Creación': s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-CO') : '',
    'Última Actualización': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('es-CO') : ''
  }))
}

// Generar datos para informe de Inventario Físico
export function generatePhysicalReport(equipos: any[], tipo?: string, filtro?: string) {
  let data = [...equipos]

  if (filtro) {
    switch (tipo) {
      case 'categoria':
        data = data.filter(e => e.categoria === filtro)
        break
      case 'pais':
        data = data.filter(e => e.pais === filtro)
        break
      case 'estado':
        data = data.filter(e => e.estado === filtro)
        break
      case 'marca':
        data = data.filter(e => e.marca === filtro)
        break
    }
  }

  return data.map(e => ({
    'País': e.pais,
    'Sede': e.sede,
    'Edificio': e.edificio,
    'Piso': e.piso,
    'Área': e.area,
    'Tipo': e.tipo,
    'Categoría': e.categoria,
    'Marca': e.marca,
    'Modelo': e.modelo,
    'Serie': e.serie,
    'IP': e.ip,
    'MAC': e.mac,
    'Estado': e.estado,
    'Responsable': e.responsable,
    'Garantía': e.garantia ? new Date(e.garantia).toLocaleDateString('es-CO') : 'Sin garantía',
    'Fecha Compra': e.fechaCompra ? new Date(e.fechaCompra).toLocaleDateString('es-CO') : '',
    'Notas': e.notas
  }))
}

// Generar informe de resumen ejecutivo
export function generateExecutiveSummary(servidores: any[], equiposFisicos: any[]) {
  const totalVMs = servidores.length
  const vmsActivas = servidores.filter(s => s.estado === 'Activo').length
  const vmsInactivas = servidores.filter(s => s.estado === 'Inactivo').length
  const vmsProduccion = servidores.filter(s => s.ambiente === 'PRODUCCION').length
  const vmsQA = servidores.filter(s => s.ambiente === 'QA').length

  const vmsSinAntivirus = servidores.filter(s => !s.antivirus?.trim()).length

  const cpuTotal = servidores.reduce((acc, s) => acc + parseToNumber(s.cpu), 0)
  const memoriaTotal = servidores.reduce((acc, s) => acc + parseToNumber(s.memoria), 0)
  const discoTotal = servidores.reduce((acc, s) => acc + parseToNumber(s.disco), 0)

  const paises = [...new Set(servidores.map(s => s.pais))]

  return {
    resumen: {
      totalVMs,
      vmsActivas,
      vmsInactivas,
      vmsProduccion,
      vmsQA,
      vmsSinAntivirus,
      totalEquiposFisicos: equiposFisicos.length,
      paises: paises.length
    },
    recursos: {
      cpuTotal,
      memoriaTotal: Math.round(memoriaTotal),
      discoTotal: Math.round(discoTotal)
    },
    porEstado: Object.entries(
      servidores.reduce((acc, s) => {
        acc[s.estado] = (acc[s.estado] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([estado, count]) => ({ estado, count })),
    porPais: Object.entries(
      servidores.reduce((acc, s) => {
        acc[s.pais] = (acc[s.pais] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([pais, count]) => ({ pais, count }))
  }
}

// Exportar a Excel
export function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Ajustar anchos de columna
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Informe')
  
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

// Obtener configuración de email
export async function getEmailConfig() {
  return prisma.emailConfig.findFirst({
    where: { activo: true }
  })
}

// Enviar informe por email
export async function sendReportByEmail(
  email: string,
  data: any[],
  reportType: string,
  filename: string
) {
  const config = await getEmailConfig()
  
  if (!config) {
    throw new Error('No hay configuración de email configurada')
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.puerto,
    secure: !config.usandoTls,
    auth: {
      user: config.usuario,
      pass: config.contrasena
    }
  })

  const excelBuffer = exportToExcel(data, filename)
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  await transporter.sendMail({
    from: config.emailFrom,
    to: email,
    subject: `Informe de Inventario - ${reportType} - ${fecha}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sistema de Inventario Almo</h2>
        <p>Se adjunta el informe solicitado:</p>
        <ul>
          <li><strong>Tipo:</strong> ${reportType}</li>
          <li><strong>Fecha:</strong> ${fecha}</li>
          <li><strong>Registros:</strong> ${data.length}</li>
        </ul>
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del Sistema de Inventario Almo.
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: excelBuffer
      }
    ]
  })

  return true
}

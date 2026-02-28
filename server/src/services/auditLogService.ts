import { prisma } from '../prisma/index'

// ============================================
// SERVICIO DE AUDIT LOG
// ============================================

export interface AuditLogData {
  usuarioId?: number | null
  usuario?: string | null
  accion: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'import' | 'change_password' | 'reset_password'
  entidad: string
  entidadId?: number | null
  datosPrevios?: any
  datosNuevos?: any
  ip?: string | null
  userAgent?: string | null
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: data.usuarioId || null,
        usuario: data.usuario || null,
        accion: data.accion,
        entidad: data.entidad,
        entidadId: data.entidadId || null,
        datosPrevios: data.datosPrevios ? JSON.stringify(data.datosPrevios) : null,
        datosNuevos: data.datosNuevos ? JSON.stringify(data.datosNuevos) : null,
        ip: data.ip || null,
        userAgent: data.userAgent || null
      }
    })
  } catch (error) {
    // No fallar la operación principal si el audit log falla
    console.error('Error creando audit log:', error)
  }
}

// Helper para obtener info del request
export function getRequestInfo(req: any) {
  return {
    ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown'
  }
}

import type { Servidor, Usuario, InventarioFisico, InventarioCloud, SecurityStats, ResourcesStats, EmailConfig, ImportResult, Permiso } from '@/types/api'

// Tipo para respuesta de login
export interface LoginResponse {
  user: Usuario & { roles: string[]; permisos: Permiso[] }
}

const API_URL = '/api'

// ============================================
// Utility Functions
// ============================================

function getHeaders(): HeadersInit {
  // Ahora usamos cookies automáticamente con credentials: 'include'
  // No necesitamos el token en el header porque la cookie se envía automáticamente
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de red' }))
    throw new Error(error.message || `Error ${response.status}`)
  }
  const json = await response.json()
  // Si la respuesta tiene estructura { success, data }, extraer data
  if (json && typeof json === 'object' && 'success' in json) {
    const data = (json as any).data
    // Si es null/undefined, devolver array vacío o null según corresponda
    if (data === null || data === undefined) {
      return null as T
    }
    return data as T
  }
  // Si json es null o undefined, devolver valor por defecto
  if (json === null || json === undefined) {
    return [] as T
  }
  return json as T
}

// ============================================
// Authentication
// ============================================

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Importante: enviar cookies con la solicitud
    body: JSON.stringify({ email, password }),
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error de autenticación' }))
    throw new Error(error.message)
  }
  
  const data = await res.json()
  // No guardamos el token en localStorage - la cookie se maneja automáticamente
  return data as LoginResponse
}

// Cerrar sesión
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Ignorar errores en logout
  }
}

// Obtener usuario actual (verificar sesión)
export async function getMe(): Promise<LoginResponse['user'] | null> {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include',
  })
  
  if (!res.ok) {
    return null
  }
  
  const data = await res.json()
  return data.user || null
}

// ============================================
// Password Management
// ============================================

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  return handleResponse<{ success: boolean; message: string }>(res)
}

export async function resetPassword(userId: number): Promise<{ success: boolean; message: string; warning?: string }> {
  const res = await fetch(`${API_URL}/auth/reset-password/${userId}`, {
    method: 'POST',
    headers: getHeaders(),
  })
  return handleResponse<{ success: boolean; message: string; warning?: string }>(res)
}

// ============================================
// Servidores
// ============================================

export async function getServidores(): Promise<Servidor[]> {
  const res = await fetch(`${API_URL}/servidores`, {
    headers: getHeaders(),
  })
  return handleResponse<Servidor[]>(res)
}

export async function createServidor(data: Partial<Servidor>): Promise<Servidor> {
  const res = await fetch(`${API_URL}/servidores`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<Servidor>(res)
}

export async function updateServidor(id: number, data: Partial<Servidor>): Promise<Servidor> {
  const res = await fetch(`${API_URL}/servidores/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<Servidor>(res)
}

export async function deleteServidor(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/servidores/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  if (!res.ok) {
    throw new Error('Error al eliminar servidor')
  }
}

export async function deleteServidoresBulk(ids: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/servidores/bulk-delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  })
  
  if (!res.ok) {
    throw new Error('Error en eliminación masiva')
  }
}

export async function importServidores(servidores: Partial<Servidor>[]): Promise<ImportResult> {
  const res = await fetch(`${API_URL}/servidores/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ servidores }),
  })
  return handleResponse<ImportResult>(res)
}

// ============================================
// Inventario Físico
// ============================================

export async function getInventarioFisico(): Promise<InventarioFisico[]> {
  const res = await fetch(`${API_URL}/inventario-fisico`, {
    headers: getHeaders(),
  })
  return handleResponse<InventarioFisico[]>(res)
}

export async function createInventarioFisico(data: Partial<InventarioFisico>): Promise<InventarioFisico> {
  const res = await fetch(`${API_URL}/inventario-fisico`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<InventarioFisico>(res)
}

export async function updateInventarioFisico(id: number, data: Partial<InventarioFisico>): Promise<InventarioFisico> {
  const res = await fetch(`${API_URL}/inventario-fisico/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<InventarioFisico>(res)
}

export async function deleteInventarioFisico(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/inventario-fisico/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  if (!res.ok) {
    throw new Error('Error al eliminar item')
  }
}

export async function deleteInventarioFisicoBulk(ids: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/inventario-fisico/bulk-delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  })
  
  if (!res.ok) {
    throw new Error('Error en eliminación masiva')
  }
}

export async function importInventarioFisico(items: Partial<InventarioFisico>[]): Promise<ImportResult> {
  const res = await fetch(`${API_URL}/inventario-fisico/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ items }),
  })
  return handleResponse<ImportResult>(res)
}

// ============================================
// Dashboard
// ============================================

export async function getDashboardStats() {
  const res = await fetch(`${API_URL}/dashboard/stats`, {
    headers: getHeaders(),
  })
  return handleResponse<any>(res)
}

export async function getDashboardSecurity(): Promise<SecurityStats> {
  const res = await fetch(`${API_URL}/dashboard/security`, {
    headers: getHeaders(),
  })
  return handleResponse<SecurityStats>(res)
}

export async function getDashboardResources(): Promise<ResourcesStats> {
  const res = await fetch(`${API_URL}/dashboard/resources`, {
    headers: getHeaders(),
  })
  return handleResponse<ResourcesStats>(res)
}

export async function getDashboardAvailability() {
  const res = await fetch(`${API_URL}/dashboard/availability`, {
    headers: getHeaders(),
  })
  return handleResponse<any>(res)
}

export async function getDashboardPhysical() {
  const res = await fetch(`${API_URL}/dashboard/physical`, {
    headers: getHeaders(),
  })
  return handleResponse<any>(res)
}

export async function getDashboardResponsables() {
  const res = await fetch(`${API_URL}/dashboard/responsables`, {
    headers: getHeaders(),
  })
  return handleResponse<any>(res)
}

// ============================================
// Admin - Módulos
// ============================================

export async function getModulos() {
  const res = await fetch(`${API_URL}/admin/modulos`, {
    headers: getHeaders(),
  })
  return handleResponse<any[]>(res)
}

export async function createModulo(data: { nombre: string; descripcion?: string; icono?: string; orden?: number }) {
  const res = await fetch(`${API_URL}/admin/modulos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<any>(res)
}

export async function updateModulo(id: number, data: { nombre?: string; descripcion?: string; icono?: string; orden?: number; activo?: boolean }) {
  const res = await fetch(`${API_URL}/admin/modulos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<any>(res)
}

export async function deleteModulo(id: number) {
  const res = await fetch(`${API_URL}/admin/modulos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error al eliminar módulo' }))
    throw new Error(error.message)
  }
  return res.json()
}

// ============================================
// Admin - Roles
// ============================================

export async function getRoles() {
  const res = await fetch(`${API_URL}/admin/roles`, {
    headers: getHeaders(),
  })
  return handleResponse<any[]>(res)
}

export async function getPermisos() {
  const res = await fetch(`${API_URL}/admin/permisos`, {
    headers: getHeaders(),
  })
  return handleResponse<any>(res)
}

export async function createRol(data: { nombre: string; descripcion?: string; moduloIds?: number[]; permisos?: { moduloId: number; accion: string }[] }) {
  const res = await fetch(`${API_URL}/admin/roles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<any>(res)
}

export async function updateRol(id: number, data: { nombre?: string; descripcion?: string; moduloIds?: number[]; permisos?: { moduloId: number; accion: string }[] }) {
  const res = await fetch(`${API_URL}/admin/roles/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<any>(res)
}

export async function deleteRol(id: number) {
  const res = await fetch(`${API_URL}/admin/roles/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error al eliminar rol' }))
    throw new Error(error.message)
  }
  return res.json()
}

// ============================================
// Admin - Usuarios
// ============================================

export async function getUsuarios(): Promise<Usuario[]> {
  const res = await fetch(`${API_URL}/admin/usuarios`, {
    headers: getHeaders(),
  })
  return handleResponse<Usuario[]>(res)
}

export async function createUsuario(data: { email: string; nombre: string; password: string; rolIds?: number[]; activo?: boolean; enviarInvitacion?: boolean }): Promise<Usuario> {
  const res = await fetch(`${API_URL}/admin/usuarios`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<Usuario>(res)
}

export async function updateUsuario(id: number, data: { nombre?: string; rolIds?: number[]; activo?: boolean; password?: string }): Promise<Usuario> {
  const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<Usuario>(res)
}

export async function deleteUsuario(id: number) {
  const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error al eliminar usuario' }))
    throw new Error(error.message)
  }
  return res.json()
}

export async function deleteAllServidores(): Promise<void> {
  const res = await fetch(`${API_URL}/admin/servidores`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  if (!res.ok) {
    throw new Error('Error al eliminar servidores')
  }
}

// ============================================
// Email
// ============================================

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const res = await fetch(`${API_URL}/email/config`, {
    headers: getHeaders(),
  })
  return handleResponse<EmailConfig | null>(res)
}

export async function saveEmailConfig(data: EmailConfig): Promise<EmailConfig> {
  const res = await fetch(`${API_URL}/email/config`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<EmailConfig>(res)
}

export async function testEmail(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/email/test`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email }),
  })
  return handleResponse<{ success: boolean; message: string }>(res)
}

export async function sendReport(email: string, tipo: string, filtro: string, tipoReporte: string, titulo: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/email/send-report`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, tipo, filtro, tipoReporte, titulo }),
  })
  return handleResponse<{ success: boolean; message: string }>(res)
}

// ============================================
// Inventario Cloud
// ============================================

export async function getInventarioCloud(): Promise<InventarioCloud[]> {
  const res = await fetch(`${API_URL}/inventario-cloud`, {
    headers: getHeaders(),
  })
  return handleResponse<InventarioCloud[]>(res)
}

export async function createInventarioCloud(data: Partial<InventarioCloud>): Promise<InventarioCloud> {
  const res = await fetch(`${API_URL}/inventario-cloud`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<InventarioCloud>(res)
}

export async function updateInventarioCloud(id: number, data: Partial<InventarioCloud>): Promise<InventarioCloud> {
  const res = await fetch(`${API_URL}/inventario-cloud/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse<InventarioCloud>(res)
}

export async function deleteInventarioCloud(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/inventario-cloud/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return handleResponse<void>(res)
}

export async function importInventarioCloud(items: any[]): Promise<ImportResult> {
  const res = await fetch(`${API_URL}/inventario-cloud/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ items }),
  })
  return handleResponse<ImportResult>(res)
}

export async function bulkDeleteInventarioCloud(ids: number[]): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/inventario-cloud/bulk-delete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  })
  return handleResponse<{ message: string }>(res)
}

// ============================================
// Backup
// ============================================

export interface Backup {
  name: string
  size: number
  sizeFormatted: string
  createdAt: string
  path: string
}

export async function getBackups(): Promise<Backup[]> {
  const res = await fetch(`${API_URL}/backup/backups`, {
    headers: getHeaders(),
  })
  return handleResponse<Backup[]>(res)
}

export async function createBackup(): Promise<{ success: boolean; message: string; data: any }> {
  const res = await fetch(`${API_URL}/backup/backups`, {
    method: 'POST',
    headers: getHeaders(),
  })
  return handleResponse<{ success: boolean; message: string; data: any }>(res)
}

export async function restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/backup/backups/restore`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ filename }),
  })
  return handleResponse<{ success: boolean; message: string }>(res)
}

export async function deleteBackup(filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/backup/backups/${filename}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return handleResponse<{ success: boolean; message: string }>(res)
}

export async function downloadBackup(filename: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/backup/backups/download/${filename}`, {
    headers: getHeaders(),
  })
  if (!res.ok) {
    throw new Error('Error al descargar backup')
  }
  return res.blob()
}

// ============================================
// PROVEEDORES
// ============================================
export async function getProveedores() {
  const res = await fetch(`${API_URL}/proveedores`, { headers: getHeaders() })
  return handleResponse<any[]>(res)
}

export async function createProveedor(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/proveedores`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateProveedor(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/proveedores/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteProveedor(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/proveedores/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// LICENCIAS
// ============================================
export async function getLicencias() {
  const res = await fetch(`${API_URL}/licencias`, { headers: getHeaders() })
  return handleResponse<any[]>(res)
}

export async function createLicencia(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/licencias`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateLicencia(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/licencias/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteLicencia(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/licencias/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// CONTRATOS
// ============================================
export async function getContratos() {
  const res = await fetch(`${API_URL}/contratos`, { headers: getHeaders() })
  return handleResponse<any[]>(res)
}

export async function createContrato(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/contratos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateContrato(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/contratos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteContrato(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/contratos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// ALERTAS
// ============================================
export async function getAlertas() {
  const res = await fetch(`${API_URL}/alertas`, { headers: getHeaders() })
  return handleResponse<any[]>(res)
}

export async function marcarAlertaLeida(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/alertas/${id}/leer`, {
    method: 'PUT',
    headers: getHeaders()
  }))
}

export async function marcarTodasAlertasLeidas() {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/alertas/marcar-todas-leidas`, {
    method: 'PUT',
    headers: getHeaders()
  }))
}

export async function deleteAlerta(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/alertas/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// MONITOR
// ============================================
export async function getMonitor() {
  const res = await fetch(`${API_URL}/monitor?_t=${Date.now()}`, { headers: getHeaders() })
  const data = await handleResponse<any[]>(res)
  return data || []
}

export async function addMonitor(data: { ip: string; nombre?: string }) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/monitor`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteMonitor(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/monitor/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

export async function pingAll() {
  const res = await fetch(`${API_URL}/monitor/ping-all`, {
    method: 'POST',
    headers: getHeaders()
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.message || 'Error en ping')
  }
  return json
}

// ============================================
// AUDIT LOG
// ============================================
export async function getAuditLogs(page = 1, limit = 100) {
  const res = await fetch(`${API_URL}/admin/audit?page=${page}&limit=${limit}`, { headers: getHeaders() })
  const result = await handleResponse<{ data: any[]; pagination?: any }>(res)
  return result?.data || []
}

// ============================================
// DOCUMENTOS
// ============================================
export async function getDocumentos(tipo?: string, entidadId?: number, entidadTipo?: string) {
  let url = `${API_URL}/documentos`
  const params = new URLSearchParams()
  if (tipo) params.append('tipo', tipo)
  if (entidadId && entidadTipo) {
    params.append('entidadId', entidadId.toString())
    params.append('entidadTipo', entidadTipo)
  }
  if (params.toString()) url += `?${params.toString()}`
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(url, { headers: getHeaders() }))
}

export async function uploadDocumento(formData: FormData) {
  return handleResponse<{ success: boolean, data: any }>(await fetch(`${API_URL}/documentos`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  }))
}

export async function deleteDocumento(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/documentos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// CERTIFICADOS SSL
// ============================================
export async function getCertificados(vencidos?: boolean, porVencer?: boolean) {
  let url = `${API_URL}/certificados`
  const params = new URLSearchParams()
  if (vencidos) params.append('vencidos', 'true')
  if (porVencer) params.append('porVencer', 'true')
  if (params.toString()) url += `?${params.toString()}`
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(url, { headers: getHeaders() }))
}

export async function getCertificado(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/certificados/${id}`, { headers: getHeaders() }))
}

export async function getCertificadosEstadisticas() {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/certificados/estadisticas`, { headers: getHeaders() }))
}

export async function createCertificado(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/certificados`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateCertificado(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/certificados/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteCertificado(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/certificados/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// CAMBIOS (Gestión de cambios)
// ============================================
export async function getCambios(filtros?: { estado?: string; tipo?: string; prioridad?: string; buscar?: string }) {
  let url = `${API_URL}/cambios`
  const params = new URLSearchParams()
  if (filtros?.estado) params.append('estado', filtros.estado)
  if (filtros?.tipo) params.append('tipo', filtros.tipo)
  if (filtros?.prioridad) params.append('prioridad', filtros.prioridad)
  if (filtros?.buscar) params.append('buscar', filtros.buscar)
  if (params.toString()) url += `?${params.toString()}`
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(url, { headers: getHeaders() }))
}

export async function getCambio(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}`, { headers: getHeaders() }))
}

export async function getCambiosEstadisticas() {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/estadisticas`, { headers: getHeaders() }))
}

export async function createCambio(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateCambio(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function aprobarCambio(id: number, comentarios?: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}/aprobar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ comentarios })
  }))
}

export async function rechazarCambio(id: number, comentarios?: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}/rechazar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ comentarios })
  }))
}

export async function iniciarCambio(id: number, responsable?: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}/iniciar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ responsable })
  }))
}

export async function completarCambio(id: number, downtimeReal?: string, notas?: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}/completar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ downtimeReal, notas })
  }))
}

export async function cancelarCambio(id: number, motivo: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/cambios/${id}/cancelar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ motivo })
  }))
}

export async function deleteCambio(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/cambios/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// BACKUPS PROGRAMADOS
// ============================================
export async function getBackupsProgramados() {
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(`${API_URL}/backups-programados`, { headers: getHeaders() }))
}

export async function getBackupProgramado(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/backups-programados/${id}`, { headers: getHeaders() }))
}

export async function getBackupsEstadisticas() {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/backups-programados/estadisticas`, { headers: getHeaders() }))
}

export async function createBackupProgramado(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/backups-programados`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateBackupProgramado(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/backups-programados/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteBackupProgramado(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/backups-programados/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

export async function ejecutarBackup(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/backups-programados/${id}/ejecutar`, {
    method: 'POST',
    headers: getHeaders()
  }))
}

export async function getHistorialBackup(id: number) {
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(`${API_URL}/backups-programados/${id}/historial`, { headers: getHeaders() }))
}

// ============================================
// COSTOS CLOUD
// ============================================
export async function getCostos(filtros?: { proveedor?: string; cuenta?: string; servicio?: string; mes?: string }) {
  let url = `${API_URL}/costos`
  const params = new URLSearchParams()
  if (filtros?.proveedor) params.append('proveedor', filtros.proveedor)
  if (filtros?.cuenta) params.append('cuenta', filtros.cuenta)
  if (filtros?.servicio) params.append('servicio', filtros.servicio)
  if (filtros?.mes) params.append('mes', filtros.mes)
  if (params.toString()) url += `?${params.toString()}`
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(url, { headers: getHeaders() }))
}

export async function getCostosResumen(anio?: string) {
  let url = `${API_URL}/costos/resumen`
  if (anio) url += `?anio=${anio}`
  return handleResponse<{ success: boolean; data: any }>(await fetch(url, { headers: getHeaders() }))
}

export async function getCostosMes(mes: string) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/costos/mes/${mes}`, { headers: getHeaders() }))
}

export async function createCosto(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/costos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function importarCostos(costos: any[]) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/costos/importar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ costos })
  }))
}

export async function updateCosto(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/costos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteCosto(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/costos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// COSTOS CLOUD (Nuevas funciones)
// ============================================
export async function getCostosCloud() {
  return handleResponse<any[]>(await fetch(`${API_URL}/costos`, { headers: getHeaders() }))
}

export async function getCostosEstadisticas() {
  return handleResponse<any>(await fetch(`${API_URL}/costos/estadisticas`, { headers: getHeaders() }))
}

export async function createCostoCloud(data: any) {
  return handleResponse<any>(await fetch(`${API_URL}/costos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateCostoCloud(id: number, data: any) {
  return handleResponse<any>(await fetch(`${API_URL}/costos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteCostoCloud(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/costos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

// ============================================
// SERVICIOS (Monitoreo)
// ============================================
export async function getServicios() {
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(`${API_URL}/servicios`, { headers: getHeaders() }))
}

export async function getServicio(id: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/servicios/${id}`, { headers: getHeaders() }))
}

export async function getServiciosEstadisticas() {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/servicios/estadisticas`, { headers: getHeaders() }))
}

export async function createServicio(data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/servicios`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function updateServicio(id: number, data: any) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/servicios/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }))
}

export async function deleteServicio(id: number) {
  return handleResponse<{ success: boolean; message: string }>(await fetch(`${API_URL}/servicios/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }))
}

export async function checkServicio(id: number, puerto?: number) {
  return handleResponse<{ success: boolean; data: any }>(await fetch(`${API_URL}/servicios/${id}/check`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ puerto })
  }))
}

export async function getHistorialServicio(id: number, horas?: number) {
  let url = `${API_URL}/servicios/${id}/historial`
  if (horas) url += `?horas=${horas}`
  return handleResponse<{ success: boolean; data: any[] }>(await fetch(url, { headers: getHeaders() }))
}

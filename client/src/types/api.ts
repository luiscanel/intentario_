// Tipos centralizados para el API

// ======================
// Tipos de Usuario y Auth
// ======================
export interface Permiso {
  modulo: string
  accion: string
}

export type RolNombre = 'admin' | 'gerencia' | 'redes' | 'soporte' | 'infra' | 'base_datos'

export interface Usuario {
  id: number
  email: string
  nombre: string
  rol: string
  activo: boolean
  createdAt: string
  roles?: string[]
  permisos?: Permiso[]
}

export interface UsuarioLogin extends Usuario {
  roles: string[]
  permisos: Permiso[]
}

// ======================
// Tipos de Servidores
// ======================
export interface Servidor {
  id: number
  pais: string
  host: string
  nombreVM: string | null
  ip: string | null
  cpu: number | null
  memoria: string | null
  disco: string | null
  ambiente: string
  arquitectura: string | null
  sistemaOperativo: string | null
  version: string | null
  antivirus: string | null
  estado: string
  responsable: string | null
  createdAt: Date
  updatedAt: Date
}

// ======================
// Tipos de Inventario Físico
// ======================
export interface InventarioFisico {
  id: number
  pais: string
  categoria: string
  marca: string
  modelo: string | null
  serie: string | null
  inventario: string | null
  estado: string
  responsable: string | null
  observaciones: string | null
  equipo: string | null
  direccionIp: string | null
  ilo: string | null
  descripcion: string | null
  serial: string | null
  sistemaOperativo: string | null
  garantia: string | null
  createdAt: Date
  updatedAt: Date
}

// ======================
// Tipos de Inventario Cloud
// ======================
export interface InventarioCloud {
  id: number
  tenant: string
  nube: string
  instanceName: string
  ipPublica: string | null
  ipPrivada: string | null
  instanceType: string | null
  cpu: number | null
  ram: string | null
  storageGib: string | null
  sistemaOperativo: string | null
  costoUsd: string | null
  hostName: string | null
  responsable: string | null
  modoUso: string | null
  service: string | null
  antivirus: string | null
  createdAt: Date
  updatedAt: Date
}

// ======================
// Tipos de Dashboard
// ======================
export interface DashboardStats {
  total: number
  activos: number
  inactivos: number
  mantenimiento: number
  decomisionados: number
  porPais: { pais: string; count: number }[]
  porAmbiente: { ambiente: string; count: number }[]
  porEstado: { estado: string; count: number }[]
  porSO: { so: string; count: number }[]
}

export interface SecurityStats {
  totalVMs: number
  conAntivirus: number
  sinAntivirus: number
  porcentajeProtegido: number
  porAntivirus: { antivirus: string; count: number }[]
  vmsSinAntivirus: Servidor[]
  porArquitectura: { name: string; count: number }[]
  porSO: { name: string; count: number }[]
  porPaisYSistema?: { pais: string; sistemas: { name: string; count: number }[] }[]
}

export interface ResourcesStats {
  totalVMs: number
  conRecursos: number
  stats: {
    cpu: { avg: number; max: number; min: number }
    memoria: { avg: number; max: number }
    disco: { total: number; avg: number }
  }
  porCpuRango: { range: string; count: number }[]
  porMemoriaRango: { range: string; count: number }[]
  porAmbiente: { ambiente: string; cpu: number; memoria: number; disco: number; count: number }[]
  porPais: { pais: string; cpu: number; memoria: number; disco: number; count: number }[]
  topCpu: any[]
  topMemoria: any[]
  topDisco: any[]
}

// ======================
// Tipos de Email
// ======================
export interface EmailConfig {
  id?: number
  host: string
  puerto: number
  usuario: string
  contrasena?: string
  usandoTls: boolean
  emailFrom: string
  activo?: boolean
}

// ======================
// Tipos Genéricos
// ======================
export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
}

export interface ImportResult {
  message: string
  count: number
  skipped: number
}

export interface Servidor {
  id: number;
  pais: string;
  host: string;
  nombreVM: string | null;
  ip: string | null;
  cpu: number | null;
  memoria: string | null;
  disco: string | null;
  ambiente: string;
  arquitectura: string | null;
  sistemaOperativo: string | null;
  version: string | null;
  antivirus: string | null;
  estado: string;
  responsable: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  email: string;
  password: string;
  nombre: string;
  rol: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventarioFisico {
  id: number;
  pais: string;
  categoria: string;
  marca: string;
  modelo: string | null;
  serie: string | null;
  inventario: string | null;
  estado: string;
  responsable: string | null;
  observaciones: string | null;
  equipo: string | null;
  direccionIp: string | null;
  ilo: string | null;
  descripcion: string | null;
  serial: string | null;
  sistemaOperativo: string | null;
  garantia: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  total: number;
  activos: number;
  inactivos: number;
  mantenimiento: number;
  decomisionados: number;
  porPais: { pais: string; count: number }[];
  porAmbiente: { ambiente: string; count: number }[];
  porEstado: { estado: string; count: number }[];
  porSO: { so: string; count: number }[];
}

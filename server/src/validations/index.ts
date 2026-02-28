import { z } from 'zod'

// ============================================
// AUTH VALIDATION
// ============================================

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'El email es requerido')
    .max(255, 'El email es muy largo')
    .refine(email => email.toLowerCase().endsWith('@grupoalmo.com'), {
      message: 'Solo se permiten usuarios con dominio @grupoalmo.com'
    }),
  password: z.string()
    .min(1, 'La contraseña es requerida')
    .max(100, 'La contraseña es muy larga')
})

export type LoginInput = z.infer<typeof loginSchema>

// ============================================
// SERVidores VALIDATION
// ============================================

export const servidorSchema = z.object({
  pais: z.string().max(100).optional().nullable(),
  host: z.string().max(255).optional().nullable(),
  nombreVM: z.string().max(255).optional().nullable(),
  ip: z.string().max(45).optional().nullable(),
  cpu: z.number().int().min(0).max(999).optional().nullable(),
  memoria: z.string().max(50).optional().nullable(),
  disco: z.string().max(50).optional().nullable(),
  ambiente: z.string().max(50).optional().nullable(),
  arquitectura: z.string().max(50).optional().nullable(),
  sistemaOperativo: z.string().max(100).optional().nullable(),
  version: z.string().max(50).optional().nullable(),
  antivirus: z.string().max(100).optional().nullable(),
  estado: z.enum(['Activo', 'Inactivo', 'Mantenimiento']).optional().nullable(),
  responsable: z.string().max(255).optional().nullable(),
})

export const servidorUpdateSchema = servidorSchema.partial()

export const servidorImportSchema = z.object({
  servidores: z.array(z.any())
    .min(1, 'Debe haber al menos un servidor')
    .max(5000, 'Máximo 5000 servidores por importación')
})

export const bulkDeleteSchema = z.object({
  ids: z.array(z.union([z.number(), z.string()]))
    .min(1, 'Debe seleccionar al menos un elemento')
    .max(500, 'Máximo 500 elementos por eliminación')
})

export type ServidorInput = z.infer<typeof servidorSchema>

// ============================================
// INVENTARIO FÍSICO VALIDATION
// ============================================

export const inventarioFisicoSchema = z.object({
  pais: z.string().max(100).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  modelo: z.string().max(255).optional().nullable(),
  serie: z.string().max(255).optional().nullable(),
  inventario: z.string().max(255).optional().nullable(),
  estado: z.enum(['Activo', 'Inactivo', 'Mantenimiento']).optional().nullable(),
  responsable: z.string().max(255).optional().nullable(),
  observaciones: z.string().max(1000).optional().nullable(),
  equipo: z.string().max(255).optional().nullable(),
  direccionIp: z.string().max(45).optional().nullable(),
  ilo: z.string().max(255).optional().nullable(),
  descripcion: z.string().max(1000).optional().nullable(),
  serial: z.string().max(255).optional().nullable(),
  sistemaOperativo: z.string().max(100).optional().nullable(),
  garantia: z.string().max(100).optional().nullable(),
})

export const inventarioFisicoUpdateSchema = inventarioFisicoSchema.partial()

export const inventarioFisicoImportSchema = z.object({
  items: z.array(z.any())
    .min(1, 'Debe haber al menos un item')
    .max(5000, 'Máximo 5000 items por importación')
})

export type InventarioFisicoInput = z.infer<typeof inventarioFisicoSchema>

// ============================================
// INVENTARIO CLOUD VALIDATION
// ============================================

export const inventarioCloudSchema = z.object({
  tenant: z.string().max(100).optional().nullable(),
  nube: z.string().max(100).optional().nullable(),
  instanceName: z.string().max(255).optional().nullable(),
  ipPublica: z.string().max(45).optional().nullable(),
  ipPrivada: z.string().max(45).optional().nullable(),
  instanceType: z.string().max(100).optional().nullable(),
  cpu: z.number().int().min(0).max(999).optional().nullable(),
  ram: z.string().max(50).optional().nullable(),
  storageGib: z.string().max(50).optional().nullable(),
  sistemaOperativo: z.string().max(100).optional().nullable(),
  costoUsd: z.string().max(50).optional().nullable(),
  hostName: z.string().max(255).optional().nullable(),
  responsable: z.string().max(255).optional().nullable(),
  modoUso: z.string().max(100).optional().nullable(),
  service: z.string().max(255).optional().nullable(),
  antivirus: z.string().max(255).optional().nullable(),
})

export const inventarioCloudUpdateSchema = inventarioCloudSchema.partial()

export const inventarioCloudImportSchema = z.object({
  items: z.array(z.object({
    tenant: z.union([z.string(), z.null()]).optional(),
    nube: z.union([z.string(), z.null()]).optional(),
    instanceName: z.union([z.string(), z.null()]).optional(),
    ipPublica: z.union([z.string(), z.null()]).optional(),
    ipPrivada: z.union([z.string(), z.null()]).optional(),
    instanceType: z.union([z.string(), z.null()]).optional(),
    cpu: z.union([z.number(), z.null()]).optional(),
    ram: z.union([z.string(), z.null()]).optional(),
    storageGib: z.union([z.string(), z.null()]).optional(),
    sistemaOperativo: z.union([z.string(), z.null()]).optional(),
    costoUsd: z.union([z.string(), z.null()]).optional(),
    hostName: z.union([z.string(), z.null()]).optional(),
    responsable: z.union([z.string(), z.null()]).optional(),
    modoUso: z.union([z.string(), z.null()]).optional(),
    service: z.union([z.string(), z.null()]).optional(),
    antivirus: z.union([z.string(), z.null()]).optional(),
  }).passthrough())
    .min(1, 'Debe haber al menos un item')
    .max(5000, 'Máximo 5000 items por importación')
})

export type InventarioCloudInput = z.infer<typeof inventarioCloudSchema>

// ============================================
// ADMIN VALIDATION
// ============================================

export const createUserSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'El email es requerido')
    .max(255, 'El email es muy largo')
    .refine(email => email.toLowerCase().endsWith('@grupoalmo.com'), {
      message: 'Solo se permiten correos con dominio @grupoalmo.com'
    }),
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es muy larga')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  rol: z.string().max(100).optional(),
  activo: z.boolean().optional(),
})

export const updateUserSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo')
    .optional(),
  rol: z.string().max(100).optional(),
  activo: z.boolean().optional(),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es muy larga')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número')
    .optional(),
})

export const createRolSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es muy largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos'),
  descripcion: z.string().max(500).optional(),
  permisos: z.array(z.string()).optional(),
})

export const updateRolSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es muy largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos')
    .optional(),
  descripcion: z.string().max(500).optional(),
  permisos: z.array(z.string()).optional(),
})

// ============================================
// EMAIL VALIDATION
// ============================================

export const sendEmailSchema = z.object({
  to: z.string().email('Email inválido').or(z.array(z.string().email('Email inválido'))),
  subject: z.string()
    .min(1, 'El asunto es requerido')
    .max(255, 'El asunto es muy largo'),
  body: z.string()
    .min(1, 'El cuerpo del email es requerido')
    .max(50000, 'El cuerpo del email es muy largo'),
})

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express'

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
        
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors,
          code: 'VALIDATION_ERROR'
        })
      }
      
      req.body = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

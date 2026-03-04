"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.licenciaUpdateSchema = exports.licenciaSchema = exports.contratoUpdateSchema = exports.contratoSchema = exports.proveedorUpdateSchema = exports.proveedorSchema = exports.sendEmailSchema = exports.updateRolSchema = exports.createRolSchema = exports.updateUserSchema = exports.createUserSchema = exports.inventarioCloudImportSchema = exports.inventarioCloudUpdateSchema = exports.inventarioCloudSchema = exports.inventarioFisicoImportSchema = exports.inventarioFisicoUpdateSchema = exports.inventarioFisicoSchema = exports.bulkDeleteSchema = exports.servidorImportSchema = exports.servidorUpdateSchema = exports.servidorSchema = exports.loginSchema = void 0;
exports.validate = validate;
const zod_1 = require("zod");
// ============================================
// AUTH VALIDATION
// ============================================
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Email inválido')
        .min(1, 'El email es requerido')
        .max(255, 'El email es muy largo')
        .refine(email => email.toLowerCase().endsWith('@grupoalmo.com'), {
        message: 'Solo se permiten usuarios con dominio @grupoalmo.com'
    }),
    password: zod_1.z.string()
        .min(1, 'La contraseña es requerida')
        .max(100, 'La contraseña es muy larga')
});
// ============================================
// SERVidores VALIDATION
// ============================================
exports.servidorSchema = zod_1.z.object({
    pais: zod_1.z.string().max(100).optional().nullable(),
    host: zod_1.z.string().max(255).optional().nullable(),
    nombreVM: zod_1.z.string().max(255).optional().nullable(),
    ip: zod_1.z.string().max(45).optional().nullable(),
    cpu: zod_1.z.number().int().min(0).max(999).optional().nullable(),
    memoria: zod_1.z.string().max(50).optional().nullable(),
    disco: zod_1.z.string().max(50).optional().nullable(),
    ambiente: zod_1.z.string().max(50).optional().nullable(),
    arquitectura: zod_1.z.string().max(50).optional().nullable(),
    sistemaOperativo: zod_1.z.string().max(100).optional().nullable(),
    version: zod_1.z.string().max(50).optional().nullable(),
    antivirus: zod_1.z.string().max(100).optional().nullable(),
    estado: zod_1.z.enum(['Activo', 'Inactivo', 'Mantenimiento']).optional().nullable(),
    responsable: zod_1.z.string().max(255).optional().nullable(),
});
exports.servidorUpdateSchema = exports.servidorSchema.partial();
exports.servidorImportSchema = zod_1.z.object({
    servidores: zod_1.z.array(zod_1.z.any())
        .min(1, 'Debe haber al menos un servidor')
        .max(5000, 'Máximo 5000 servidores por importación')
});
exports.bulkDeleteSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.union([zod_1.z.number(), zod_1.z.string()]))
        .min(1, 'Debe seleccionar al menos un elemento')
        .max(500, 'Máximo 500 elementos por eliminación')
});
// ============================================
// INVENTARIO FÍSICO VALIDATION
// ============================================
exports.inventarioFisicoSchema = zod_1.z.object({
    pais: zod_1.z.string().max(100).optional().nullable(),
    categoria: zod_1.z.string().max(100).optional().nullable(),
    marca: zod_1.z.string().max(100).optional().nullable(),
    modelo: zod_1.z.string().max(255).optional().nullable(),
    serie: zod_1.z.string().max(255).optional().nullable(),
    inventario: zod_1.z.string().max(255).optional().nullable(),
    estado: zod_1.z.enum(['Activo', 'Inactivo', 'Mantenimiento']).optional().nullable(),
    responsable: zod_1.z.string().max(255).optional().nullable(),
    observaciones: zod_1.z.string().max(1000).optional().nullable(),
    equipo: zod_1.z.string().max(255).optional().nullable(),
    direccionIp: zod_1.z.string().max(45).optional().nullable(),
    ilo: zod_1.z.string().max(255).optional().nullable(),
    descripcion: zod_1.z.string().max(1000).optional().nullable(),
    serial: zod_1.z.string().max(255).optional().nullable(),
    sistemaOperativo: zod_1.z.string().max(100).optional().nullable(),
    garantia: zod_1.z.string().max(100).optional().nullable(),
});
exports.inventarioFisicoUpdateSchema = exports.inventarioFisicoSchema.partial();
exports.inventarioFisicoImportSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.any())
        .min(1, 'Debe haber al menos un item')
        .max(5000, 'Máximo 5000 items por importación')
});
// ============================================
// INVENTARIO CLOUD VALIDATION
// ============================================
exports.inventarioCloudSchema = zod_1.z.object({
    tenant: zod_1.z.string().max(100).optional().nullable(),
    nube: zod_1.z.string().max(100).optional().nullable(),
    instanceName: zod_1.z.string().max(255).optional().nullable(),
    ipPublica: zod_1.z.string().max(45).optional().nullable(),
    ipPrivada: zod_1.z.string().max(45).optional().nullable(),
    instanceType: zod_1.z.string().max(100).optional().nullable(),
    cpu: zod_1.z.number().int().min(0).max(999).optional().nullable(),
    ram: zod_1.z.string().max(50).optional().nullable(),
    storageGib: zod_1.z.string().max(50).optional().nullable(),
    sistemaOperativo: zod_1.z.string().max(100).optional().nullable(),
    costoUsd: zod_1.z.string().max(50).optional().nullable(),
    hostName: zod_1.z.string().max(255).optional().nullable(),
    responsable: zod_1.z.string().max(255).optional().nullable(),
    modoUso: zod_1.z.string().max(100).optional().nullable(),
    service: zod_1.z.string().max(255).optional().nullable(),
    antivirus: zod_1.z.string().max(255).optional().nullable(),
});
exports.inventarioCloudUpdateSchema = exports.inventarioCloudSchema.partial();
exports.inventarioCloudImportSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        tenant: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        nube: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        instanceName: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        ipPublica: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        ipPrivada: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        instanceType: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        cpu: zod_1.z.union([zod_1.z.number(), zod_1.z.null()]).optional(),
        ram: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        storageGib: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        sistemaOperativo: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        costoUsd: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        hostName: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        responsable: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        modoUso: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        service: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
        antivirus: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
    }).passthrough())
        .min(1, 'Debe haber al menos un item')
        .max(5000, 'Máximo 5000 items por importación')
});
// ============================================
// ADMIN VALIDATION
// ============================================
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Email inválido')
        .min(1, 'El email es requerido')
        .max(255, 'El email es muy largo')
        .refine(email => email.toLowerCase().endsWith('@grupoalmo.com'), {
        message: 'Solo se permiten correos con dominio @grupoalmo.com'
    }),
    nombre: zod_1.z.string()
        .min(1, 'El nombre es requerido')
        .max(255, 'El nombre es muy largo'),
    password: zod_1.z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(100, 'La contraseña es muy larga')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    rol: zod_1.z.string().max(100).optional(),
    activo: zod_1.z.boolean().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    nombre: zod_1.z.string()
        .min(1, 'El nombre es requerido')
        .max(255, 'El nombre es muy largo')
        .optional(),
    rol: zod_1.z.string().max(100).optional(),
    activo: zod_1.z.boolean().optional(),
    password: zod_1.z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(100, 'La contraseña es muy larga')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número')
        .optional(),
});
exports.createRolSchema = zod_1.z.object({
    nombre: zod_1.z.string()
        .min(1, 'El nombre es requerido')
        .max(100, 'El nombre es muy largo')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos'),
    descripcion: zod_1.z.string().max(500).optional(),
    permisos: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateRolSchema = zod_1.z.object({
    nombre: zod_1.z.string()
        .min(1, 'El nombre es requerido')
        .max(100, 'El nombre es muy largo')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos')
        .optional(),
    descripcion: zod_1.z.string().max(500).optional(),
    permisos: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================
// EMAIL VALIDATION
// ============================================
exports.sendEmailSchema = zod_1.z.object({
    to: zod_1.z.string().email('Email inválido').or(zod_1.z.array(zod_1.z.string().email('Email inválido'))),
    subject: zod_1.z.string()
        .min(1, 'El asunto es requerido')
        .max(255, 'El asunto es muy largo'),
    body: zod_1.z.string()
        .min(1, 'El cuerpo del email es requerido')
        .max(50000, 'El cuerpo del email es muy largo'),
});
// ============================================
// PROVEEDOR VALIDATION
// ============================================
exports.proveedorSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es requerido').max(255),
    contacto: zod_1.z.string().max(255).optional().nullable(),
    email: zod_1.z.string().email('Email inválido').max(255).optional().nullable(),
    telefono: zod_1.z.string().max(50).optional().nullable(),
    direccion: zod_1.z.string().max(500).optional().nullable(),
    servicios: zod_1.z.string().max(1000).optional().nullable(),
    notas: zod_1.z.string().max(2000).optional().nullable(),
    activo: zod_1.z.boolean().optional(),
});
exports.proveedorUpdateSchema = exports.proveedorSchema.partial();
// ============================================
// CONTRATO VALIDATION
// ============================================
exports.contratoSchema = zod_1.z.object({
    proveedorId: zod_1.z.number().int().positive().optional().nullable(),
    tipo: zod_1.z.string().min(1, 'El tipo es requerido').max(100),
    numero: zod_1.z.string().max(100).optional().nullable(),
    objeto: zod_1.z.string().max(1000).optional().nullable(),
    monto: zod_1.z.number().min(0).optional().nullable(),
    moneda: zod_1.z.string().max(10).optional(),
    fechaInicio: zod_1.z.string().or(zod_1.z.date()),
    fechaFin: zod_1.z.string().or(zod_1.z.date()),
    estado: zod_1.z.string().max(50).optional(),
    observaciones: zod_1.z.string().max(2000).optional().nullable(),
});
exports.contratoUpdateSchema = exports.contratoSchema.partial();
// ============================================
// LICENCIA VALIDATION
// ============================================
exports.licenciaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es requerido').max(255),
    tipo: zod_1.z.string().min(1, 'El tipo es requerido').max(100),
    version: zod_1.z.string().max(50).optional().nullable(),
    cantidad: zod_1.z.number().int().min(0).optional(),
    usada: zod_1.z.number().int().min(0).optional(),
    costo: zod_1.z.number().min(0).optional().nullable(),
    moneda: zod_1.z.string().max(10).optional(),
    fechaCompra: zod_1.z.string().or(zod_1.z.date()).optional().nullable(),
    fechaVencimiento: zod_1.z.string().or(zod_1.z.date()).optional().nullable(),
    proveedorId: zod_1.z.number().int().positive().optional().nullable(),
    servidorId: zod_1.z.number().int().positive().optional().nullable(),
    notas: zod_1.z.string().max(2000).optional().nullable(),
    activa: zod_1.z.boolean().optional(),
});
exports.licenciaUpdateSchema = exports.licenciaSchema.partial();
function validate(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors,
                    code: 'VALIDATION_ERROR'
                });
            }
            req.body = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
}

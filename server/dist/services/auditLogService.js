"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.getRequestInfo = getRequestInfo;
const index_1 = require("../prisma/index");
async function createAuditLog(data) {
    try {
        await index_1.prisma.auditLog.create({
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
        });
    }
    catch (error) {
        // No fallar la operación principal si el audit log falla
        console.error('Error creando audit log:', error);
    }
}
// Helper para obtener info del request
function getRequestInfo(req) {
    return {
        ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
    };
}

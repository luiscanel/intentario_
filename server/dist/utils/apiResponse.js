"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.created = created;
exports.updated = updated;
exports.deleted = deleted;
exports.withPagination = withPagination;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
exports.conflict = conflict;
exports.serverError = serverError;
exports.asyncHandler = asyncHandler;
exports.sanitizeInput = sanitizeInput;
exports.handleZodError = handleZodError;
exports.validateIdParam = validateIdParam;
exports.parsePagination = parsePagination;
exports.buildWhereClause = buildWhereClause;
// ============================================
// SUCCESS RESPONSES
// ============================================
function success(data, message = 'Operación exitosa') {
    return { success: true, data, message };
}
function created(data, message = 'Recurso creado') {
    return { success: true, data, message };
}
function updated(data, message = 'Recurso actualizado') {
    return { success: true, data, message };
}
function deleted(message = 'Recurso eliminado') {
    return { success: true, message };
}
function withPagination(data, page, limit, total) {
    return {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}
// ============================================
// ERROR RESPONSES
// ============================================
function badRequest(message = 'Solicitud inválida', code = 'BAD_REQUEST', details) {
    return { success: false, message, code, details };
}
function unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED') {
    return { success: false, message, code };
}
function forbidden(message = 'Acceso denegado', code = 'FORBIDDEN') {
    return { success: false, message, code };
}
function notFound(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    return { success: false, message, code };
}
function conflict(message = 'Conflicto de datos', code = 'CONFLICT') {
    return { success: false, message, code };
}
function serverError(message = 'Error del servidor', code = 'SERVER_ERROR', details) {
    return { success: false, message, code, details };
}
// ============================================
// WRAPPER FOR ROUTE HANDLERS
// ============================================
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// ============================================
// INPUT SANITIZATION MIDDLEWARE
// ============================================
/**
 * Sanitiza inputs para prevenir SQL Injection y XSS
 */
function sanitizeInput(req, res, next) {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remover caracteres peligrosos para SQL
            let sanitized = value
                .replace(/'/g, '')
                .replace(/"/g, '')
                .replace(/;/g, '')
                .replace(/--/g, '')
                .replace(/\/\*/g, '')
                .replace(/\*\//g, '')
                .replace(/xp_/gi, '')
                .replace(/sp_/gi, '')
                .replace(/exec/gi, '')
                .replace(/execute/gi, '');
            // Remover tags HTML básicos para XSS
            sanitized = sanitized
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
            return sanitized.trim();
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (value && typeof value === 'object') {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };
    // Sanitizar body, query y params
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeValue(req.params);
    }
    next();
}
// ============================================
// VALIDATION ERROR HANDLER
// ============================================
function handleZodError(error) {
    if (error.name === 'ZodError') {
        const issues = error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
        return {
            success: false,
            message: 'Error de validación',
            code: 'VALIDATION_ERROR',
            details: issues
        };
    }
    return serverError('Error de validación');
}
// ============================================
// ID PARAM VALIDATOR
// ============================================
function validateIdParam(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName];
        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json(badRequest(`ID inválido: ${id}`, 'INVALID_ID'));
        }
        req.params[paramName] = parsedId.toString();
        next();
    };
}
// ============================================
// PAGINATION HELPER
// ============================================
function parsePagination(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function buildWhereClause(filters) {
    const where = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
            if (key === 'buscar') {
                // Búsqueda textual en múltiples campos
                where.OR = [
                    { nombre: { contains: value } },
                    { descripcion: { contains: value } },
                    { titulo: { contains: value } },
                    { email: { contains: value } }
                ].filter(f => f);
            }
            else if (typeof value === 'string' && value.includes(',')) {
                // Filtrar por múltiples valores
                where[key] = { in: value.split(',') };
            }
            else {
                where[key] = value;
            }
        }
    }
    return where;
}

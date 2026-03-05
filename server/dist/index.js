"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const servidores_1 = __importDefault(require("./routes/servidores"));
const inventarioFisico_1 = __importDefault(require("./routes/inventarioFisico"));
const inventarioCloud_1 = __importDefault(require("./routes/inventarioCloud"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const dashboardNew_1 = __importDefault(require("./routes/dashboardNew"));
const admin_1 = __importDefault(require("./routes/admin"));
const email_1 = __importDefault(require("./routes/email"));
const backup_1 = __importDefault(require("./routes/backup"));
const proveedores_1 = __importDefault(require("./routes/proveedores"));
const licencias_1 = __importDefault(require("./routes/licencias"));
const contratos_1 = __importDefault(require("./routes/contratos"));
const alertas_1 = __importDefault(require("./routes/alertas"));
const monitor_1 = __importDefault(require("./routes/monitor"));
const documentos_1 = __importDefault(require("./routes/documentos"));
// Nuevas rutas de módulos
const certificados_1 = __importDefault(require("./routes/nuevos/certificados"));
const cambios_1 = __importDefault(require("./routes/nuevos/cambios"));
const backups_1 = __importDefault(require("./routes/nuevos/backups"));
const costos_1 = __importDefault(require("./routes/nuevos/costos"));
const monitor_2 = __importDefault(require("./routes/nuevos/monitor"));
// Importar configuración y seguridad
const index_js_1 = require("./config/index.js");
const logger_js_1 = require("./utils/logger.js");
const security_js_1 = require("./middleware/security.js");
// Importar servicio de notificaciones
const notificacionesService_js_1 = require("./services/notificacionesService.js");
// Cargar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(index_js_1.config.PORT);
const HOST = index_js_1.config.HOST;
// ============================================
// MIDDLEWARE DE SEGURIDAD
// ============================================
// Helmet - Headers de seguridad
app.use(security_js_1.helmetMiddleware);
// Rate limiting general (100 requests / 15 min)
app.use(security_js_1.generalRateLimiter);
// Rate limiting específico para auth (5 attempts / 15 min)
app.use('/api/auth', security_js_1.authRateLimiter);
// CORS configurado
app.use((0, cors_1.default)(security_js_1.corsOptions));
// Parser JSON con límite de tamaño (10MB para importaciones grandes)
app.use(express_1.default.json({ limit: '10mb' }));
// Parser para form data
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Archivos estáticos (uploads) - con restricciones de seguridad
app.use('/uploads', (req, res, next) => {
    // Restringir MIME types permitidos
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'text/plain'
    ];
    const fileExt = req.path.split('.').pop()?.toLowerCase();
    const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
    // Solo permitir extensiones conocidas
    if (fileExt && !allowedExts.includes(fileExt)) {
        return res.status(403).json({ success: false, message: 'Tipo de archivo no permitido' });
    }
    next();
}, express_1.default.static(path_1.default.join(process.cwd(), 'uploads'), {
    maxAge: '1h',
    dotfiles: 'ignore',
    etag: true,
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt']
}));
// Logging de requests
app.use(security_js_1.requestLogger);
// ============================================
// RUTAS
// ============================================
// Rutas públicas (auth tiene rate limiting específico)
app.use('/api/auth', auth_1.default);
// Rutas de dashboards (protegidas)
app.use('/api/dashboard', dashboardNew_1.default);
app.use('/api/dashboard', dashboard_1.default);
// Rutas protegidas
app.use('/api/servidores', servidores_1.default);
app.use('/api/inventario-fisico', inventarioFisico_1.default);
app.use('/api/inventario-cloud', inventarioCloud_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/email', email_1.default);
app.use('/api/backup', backup_1.default);
// Nuevas rutas
app.use('/api/proveedores', proveedores_1.default);
app.use('/api/licencias', licencias_1.default);
app.use('/api/contratos', contratos_1.default);
app.use('/api/alertas', alertas_1.default);
app.use('/api/monitor', monitor_1.default);
app.use('/api/documentos', documentos_1.default);
// Nuevos módulos
app.use('/api/certificados', certificados_1.default);
app.use('/api/cambios', cambios_1.default);
app.use('/api/backups-programados', backups_1.default);
app.use('/api/costos', costos_1.default);
app.use('/api/servicios', monitor_2.default);
// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: index_js_1.config.NODE_ENV
    });
});
// ============================================
// ERROR HANDLER
// ============================================
app.use(security_js_1.errorHandler);
// ============================================
// INICIO DEL SERVIDOR
// ============================================
app.listen(PORT, HOST, () => {
    logger_js_1.log.info(`Inventario Almo iniciado`, {
        environment: index_js_1.config.NODE_ENV,
        port: PORT,
        host: HOST,
        rateLimit: `${index_js_1.config.RATE_LIMIT_MAX_REQUESTS} req/${index_js_1.config.RATE_LIMIT_WINDOW_MS}`
    });
    // Iniciar servicio de notificaciones programadas (solo en producción o si está habilitado)
    if (index_js_1.config.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true') {
        (0, notificacionesService_js_1.startNotificationService)();
    }
});

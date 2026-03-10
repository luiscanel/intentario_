"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../prisma/index.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/config-alertas', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const configs = await index_js_1.prisma.configAlerta.findMany({ orderBy: { tipo: 'asc' } });
        res.json({ success: true, data: configs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});
router.put('/config-alertas/:tipo', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { tipo } = req.params;
        const { nombre, diasAntelacion, activo, enviarEmail, crearAlerta, emailDestino } = req.body;
        const config = await index_js_1.prisma.configAlerta.update({
            where: { tipo },
            data: {
                ...(nombre && { nombre }),
                ...(diasAntelacion !== undefined && { diasAntelacion }),
                ...(activo !== undefined && { activo }),
                ...(enviarEmail !== undefined && { enviarEmail }),
                ...(crearAlerta !== undefined && { crearAlerta }),
                ...(emailDestino !== undefined && { emailDestino })
            }
        });
        res.json({ success: true, data: config, message: 'Configuración actualizada' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});
router.post('/ejecutar-verificacion', auth_js_1.authMiddleware, async (req, res) => {
    try {
        const { runScheduledChecks, checkAllMonitoredServices } = await Promise.resolve().then(() => __importStar(require('../services/notificacionesService.js')));
        await runScheduledChecks();
        await checkAllMonitoredServices();
        res.json({ success: true, message: 'Verificación ejecutada' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error al ejecutar verificación' });
    }
});
exports.default = router;

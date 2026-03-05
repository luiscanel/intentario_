"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = requestTimeout;
// Middleware para timeout de requests
function requestTimeout(timeoutMs = 30000) {
    return (req, res, next) => {
        // Set timeout en la respuesta
        res.setTimeout(timeoutMs, () => {
            // Enviar respuesta de timeout
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    message: 'Request timeout - la operación tardó demasiado',
                    code: 'REQUEST_TIMEOUT'
                });
            }
            req.destroy();
        });
        next();
    };
}

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
exports.checkService = checkService;
exports.checkMultipleServices = checkMultipleServices;
const net = __importStar(require("net"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const dns = __importStar(require("dns"));
const util_1 = require("util");
const dnsResolve = (0, util_1.promisify)(dns.resolve);
// Función principal para verificar un servicio
async function checkService(host, tipo, puerto = 80) {
    try {
        switch (tipo.toLowerCase()) {
            case 'ping':
                return await checkPing(host);
            case 'http':
            case 'https':
                return await checkHttp(host, tipo === 'https', puerto);
            case 'tcp':
                return await checkTcp(host, puerto);
            case 'ssh':
                return await checkTcp(host, puerto || 22);
            case 'mysql':
                return await checkTcp(host, puerto || 3306);
            case 'postgres':
            case 'postgresql':
                return await checkTcp(host, puerto || 5432);
            case 'redis':
                return await checkTcp(host, puerto || 6379);
            case 'dns':
                return await checkDns(host);
            default:
                // Por defecto, hacer HTTP
                return await checkHttp(host, tipo === 'https', puerto);
        }
    }
    catch (error) {
        return {
            status: 'offline',
            message: error.message
        };
    }
}
// Verificar ping (usando TCP connect como alternativa ya que raw ping requiere permisos)
async function checkPing(host) {
    const start = Date.now();
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ status: 'online', latency });
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: 'offline', message: 'Timeout' });
        });
        socket.on('error', (err) => {
            socket.destroy();
            resolve({ status: 'offline', message: err.message });
        });
        // Intentar conectar al puerto 80 o 443
        const port = host.includes(':') ? parseInt(host.split(':')[1]) || 80 : 80;
        const hostname = host.includes(':') ? host.split(':')[0] : host;
        socket.connect(port, hostname);
    });
}
// Verificar HTTP/HTTPS
async function checkHttp(host, isHttps = false, puerto = 80) {
    const start = Date.now();
    const protocol = isHttps ? https : http;
    const port = isHttps ? (puerto === 80 ? 443 : puerto) : (puerto === 443 ? 80 : puerto);
    const hostname = host.includes(':') ? host.split(':')[0] : host;
    const urlPath = host.includes(':') && host.split(':')[1] ? `/${host.split(':').slice(2).join('/')}` : '/';
    return new Promise((resolve) => {
        const req = protocol.get(`http${isHttps ? 's' : ''}://${hostname}:${port}${urlPath}`, {
            timeout: 10000
        }, (res) => {
            const latency = Date.now() - start;
            if (res.statusCode && res.statusCode < 500) {
                resolve({ status: 'online', latency });
            }
            else {
                resolve({ status: 'online', latency }); // Cualquier respuesta es "online"
            }
            res.on('data', () => { });
            res.on('end', () => { });
        });
        req.on('error', (err) => {
            resolve({ status: 'offline', message: err.message });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'offline', message: 'Timeout' });
        });
        req.end();
    });
}
// Verificar conexión TCP
async function checkTcp(host, puerto) {
    const start = Date.now();
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ status: 'online', latency });
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: 'offline', message: 'Timeout' });
        });
        socket.on('error', (err) => {
            socket.destroy();
            resolve({ status: 'offline', message: err.message });
        });
        const port = host.includes(':') ? parseInt(host.split(':')[1]) || puerto : puerto;
        const hostname = host.includes(':') ? host.split(':')[0] : host;
        socket.connect(port, hostname);
    });
}
// Verificar DNS
async function checkDns(host) {
    const start = Date.now();
    try {
        await dnsResolve(host);
        const latency = Date.now() - start;
        return { status: 'online', latency };
    }
    catch (error) {
        return { status: 'offline', message: error.message };
    }
}
// Función para verificar múltiples servicios
async function checkMultipleServices(services) {
    const results = await Promise.all(services.map(s => checkService(s.ip, s.tipo, s.puerto)));
    return results;
}

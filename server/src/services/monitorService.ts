import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as dns from 'dns'
import { promisify } from 'util'

const dnsResolve = promisify(dns.resolve)

export interface CheckResult {
  status: 'online' | 'offline' | 'unknown'
  latency?: number
  message?: string
}

// Función principal para verificar un servicio
export async function checkService(host: string, tipo: string, puerto: number = 80): Promise<CheckResult> {
  try {
    switch (tipo.toLowerCase()) {
      case 'ping':
        return await checkPing(host)
      case 'http':
      case 'https':
        return await checkHttp(host, tipo === 'https', puerto)
      case 'tcp':
        return await checkTcp(host, puerto)
      case 'ssh':
        return await checkTcp(host, puerto || 22)
      case 'mysql':
        return await checkTcp(host, puerto || 3306)
      case 'postgres':
      case 'postgresql':
        return await checkTcp(host, puerto || 5432)
      case 'redis':
        return await checkTcp(host, puerto || 6379)
      case 'dns':
        return await checkDns(host)
      default:
        // Por defecto, hacer HTTP
        return await checkHttp(host, tipo === 'https', puerto)
    }
  } catch (error: any) {
    return {
      status: 'offline',
      message: error.message
    }
  }
}

// Verificar ping (usando TCP connect como alternativa ya que raw ping requiere permisos)
async function checkPing(host: string): Promise<CheckResult> {
  const start = Date.now()
  
  return new Promise((resolve) => {
    const socket = new net.Socket()
    
    socket.setTimeout(5000)
    
    socket.on('connect', () => {
      const latency = Date.now() - start
      socket.destroy()
      resolve({ status: 'online', latency })
    })
    
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ status: 'offline', message: 'Timeout' })
    })
    
    socket.on('error', (err) => {
      socket.destroy()
      resolve({ status: 'offline', message: err.message })
    })
    
    // Intentar conectar al puerto 80 o 443
    const port = host.includes(':') ? parseInt(host.split(':')[1]) || 80 : 80
    const hostname = host.includes(':') ? host.split(':')[0] : host
    
    socket.connect(port, hostname)
  })
}

// Verificar HTTP/HTTPS
async function checkHttp(host: string, isHttps: boolean = false, puerto: number = 80): Promise<CheckResult> {
  const start = Date.now()
  const protocol = isHttps ? https : http
  
  const port = isHttps ? (puerto === 80 ? 443 : puerto) : (puerto === 443 ? 80 : puerto)
  const hostname = host.includes(':') ? host.split(':')[0] : host
  const urlPath = host.includes(':') && host.split(':')[1] ? `/${host.split(':').slice(2).join('/')}` : '/'
  
  return new Promise((resolve) => {
    const req = protocol.get(`http${isHttps ? 's' : ''}://${hostname}:${port}${urlPath}`, { 
      timeout: 10000 
    }, (res) => {
      const latency = Date.now() - start
      
      if (res.statusCode && res.statusCode < 500) {
        resolve({ status: 'online', latency })
      } else {
        resolve({ status: 'online', latency }) // Cualquier respuesta es "online"
      }
      
      res.on('data', () => {})
      res.on('end', () => {})
    })
    
    req.on('error', (err) => {
      resolve({ status: 'offline', message: err.message })
    })
    
    req.on('timeout', () => {
      req.destroy()
      resolve({ status: 'offline', message: 'Timeout' })
    })
    
    req.end()
  })
}

// Verificar conexión TCP
async function checkTcp(host: string, puerto: number): Promise<CheckResult> {
  const start = Date.now()
  
  return new Promise((resolve) => {
    const socket = new net.Socket()
    
    socket.setTimeout(5000)
    
    socket.on('connect', () => {
      const latency = Date.now() - start
      socket.destroy()
      resolve({ status: 'online', latency })
    })
    
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ status: 'offline', message: 'Timeout' })
    })
    
    socket.on('error', (err) => {
      socket.destroy()
      resolve({ status: 'offline', message: err.message })
    })
    
    const port = host.includes(':') ? parseInt(host.split(':')[1]) || puerto : puerto
    const hostname = host.includes(':') ? host.split(':')[0] : host
    
    socket.connect(port, hostname)
  })
}

// Verificar DNS
async function checkDns(host: string): Promise<CheckResult> {
  const start = Date.now()
  
  try {
    await dnsResolve(host)
    const latency = Date.now() - start
    return { status: 'online', latency }
  } catch (error: any) {
    return { status: 'offline', message: error.message }
  }
}

// Función para verificar múltiples servicios
export async function checkMultipleServices(services: Array<{ ip: string, tipo: string, puerto?: number }>): Promise<CheckResult[]> {
  const results = await Promise.all(
    services.map(s => checkService(s.ip, s.tipo, s.puerto))
  )
  return results
}

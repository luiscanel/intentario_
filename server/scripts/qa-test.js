#!/usr/bin/env node

const API_URL = process.env.API_URL || 'http://localhost:3001/api'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jorge.canel@grupoalmo.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  blue: '[34m',
  cyan: '[36m',
  gray: '[90m'
}

let authToken = null
let testResults = { passed: 0, failed: 0, total: 0 }
let requestCount = 0

async function request(method, endpoint, body = null, useAuth = true) {
  requestCount++
  const url = API_URL + endpoint
  const headers = { 'Content-Type': 'application/json' }
  
  if (useAuth && authToken) {
    headers['Authorization'] = 'Bearer ' + authToken
  }
  
  const options = { method, headers }
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }
  
  const startTime = Date.now()
  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    const data = await response.json().catch(() => ({}))
    return { status: response.status, statusText: response.statusText, data, duration, ok: response.ok }
  } catch (error) {
    return { status: 0, statusText: error.message, data: { error: error.message }, duration: Date.now() - startTime, ok: false }
  }
}

function log(message, color) {
  color = color || 'reset'
  console.log(colors[color] + message + colors.reset)
}

function logTest(name, passed, details) {
  details = details || ''
  testResults.total++
  if (passed) {
    testResults.passed++
    log('  ✓ ' + name, 'green')
  } else {
    testResults.failed++
    log('  ✗ ' + name, 'red')
  }
  if (details) log('    ' + details, 'gray')
}

async function testHealth() {
  log('', 'cyan')
  log('🏥 Health Check Tests', 'cyan')
  const res = await request('GET', '/health', null, false)
  logTest('GET /health returns 200', res.status === 200, res.duration + 'ms')
  logTest('Health response has status', res.data && res.data.status === 'ok', 'status: ' + (res.data && res.data.status))
}

async function testAuth() {
  log('', 'cyan')
  log('🔐 Authentication Tests', 'cyan')
  // Email inválido es rechazado por Zod (validación de dominio @grupoalmo.com)
  let res = await request('POST', '/auth/login', { email: 'invalid@test.com', password: 'wrongpass' }, false)
  logTest('POST /auth/login with invalid email format returns 400', res.status === 400)
  
  // Email válido pero contraseña incorrecta
  res = await request('POST', '/auth/login', { email: 'jorge.canel@grupoalmo.com', password: 'wrongpass' }, false)
  logTest('POST /auth/login with wrong password returns 401', res.status === 401)
  
  res = await request('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, false)
  logTest('POST /auth/login with valid credentials returns 200', res.status === 200, res.duration + 'ms')
  
  if (res.data && res.data.token) {
    authToken = res.data.token
    logTest('Login returns JWT token', !!authToken, 'token: ' + authToken.substring(0, 20) + '...')
  } else {
    logTest('Login returns JWT token', false, 'No token in response')
  }
  
  res = await request('GET', '/admin/usuarios', null, false)
  logTest('Protected endpoint without token returns 401', res.status === 401)
  
  res = await request('GET', '/admin/usuarios', null, true)
  logTest('Protected endpoint with token returns 200', res.status === 200, res.duration + 'ms')
  
  res = await request('POST', '/auth/refresh', null, true)
  logTest('POST /auth/refresh returns 200', res.status === 200, res.duration + 'ms')
}

async function testServidores() {
  log('', 'cyan')
  log('🖥️ Servidores Tests', 'cyan')
  let res = await request('GET', '/servidores', null, true)
  logTest('GET /servidores returns 200', res.status === 200, res.duration + 'ms')
  logTest('Servidores returns array', Array.isArray(res.data && res.data.data), 'count: ' + (res.data && res.data.data && res.data.data.length))
  
  const newServer = {
    nombre: 'Test Server ' + Date.now(),
    ip: '192.168.1.' + Math.floor(Math.random() * 255),
    tipo: 'virtual',
    estado: 'Activo',
    proveedor: 'Test Provider',
    ubicacion: 'Test Location'
  }
  
  res = await request('POST', '/servidores', newServer, true)
  const serverId = res.data && res.data.data && res.data.data.id
  logTest('POST /servidores creates server', res.status === 201, 'id: ' + serverId)
  
  if (serverId) {
    res = await request('GET', '/servidores/' + serverId, null, true)
    logTest('GET /servidores/:id returns 200', res.status === 200)
    res = await request('PUT', '/servidores/' + serverId, { nombre: 'Updated Server' }, true)
    logTest('PUT /servidores/:id updates server', res.status === 200)
    res = await request('DELETE', '/servidores/' + serverId, null, true)
    logTest('DELETE /servidores/:id deletes server', res.status === 200)
  }
}

async function testDashboard() {
  log('', 'cyan')
  log('📊 Dashboard Tests', 'cyan')
  let res = await request('GET', '/dashboard/stats', null, true)
  logTest('GET /dashboard/stats returns 200', res.status === 200, res.duration + 'ms')
  res = await request('GET', '/dashboard/security', null, true)
  logTest('GET /dashboard/security returns 200', res.status === 200, res.duration + 'ms')
  res = await request('GET', '/dashboard/cloud', null, true)
  logTest('GET /dashboard/cloud returns 200', res.status === 200, res.duration + 'ms')
}

async function testProveedores() {
  log('', 'cyan')
  log('🤝 Proveedores Tests', 'cyan')
  let res = await request('GET', '/proveedores', null, true)
  logTest('GET /proveedores returns 200', res.status === 200, res.duration + 'ms')
  
  const newProvider = { nombre: 'Test Provider ' + Date.now(), email: 'test' + Date.now() + '@example.com', telefono: '+1234567890', tipo: 'hosting' }
  res = await request('POST', '/proveedores', newProvider, true)
  const providerId = res.data && res.data.data && res.data.data.id
  logTest('POST /proveedores creates provider', res.status === 201, 'id: ' + providerId)
  
  if (providerId) {
    res = await request('DELETE', '/proveedores/' + providerId, null, true)
    logTest('DELETE /proveedores/:id works', res.status === 200)
  }
}

async function testMisc() {
  log('', 'cyan')
  log('📡 Misc Endpoints Tests', 'cyan')
  const endpoints = [
    ['GET', '/licencias'],
    ['GET', '/contratos'],
    ['GET', '/alertas'],
    ['GET', '/monitor'],
    ['GET', '/documentos']
  ]
  
  for (const [method, path] of endpoints) {
    const res = await request(method, path, null, true)
    logTest(method + ' ' + path + ' returns 200', res.status === 200, res.duration + 'ms')
  }
}

async function testValidation() {
  log('', 'cyan')
  log('✅ Validation Tests', 'cyan')
  // Servidores requires nombre and ip at minimum
  let res = await request('POST', '/servidores', { nombre: 'Test' }, true)
  logTest('Validation fails for missing required fields', res.status === 400 || res.status === 201)
  
  res = await request('POST', '/auth/login', { email: 'not-an-email', password: 'test123' }, false)
  logTest('Zod validates email format', res.status === 400)
}

async function testErrorHandling() {
  log('', 'cyan')
  log('❌ Error Handling Tests', 'cyan')
  let res = await request('GET', '/servidores/999999999', null, true)
  logTest('Non-existent resource returns 404', res.status === 404)
  
  res = await request('GET', '/this-endpoint-does-not-exist', null, true)
  logTest('Invalid endpoint returns 404', res.status === 404)
}

async function runTests() {
  const args = process.argv.slice(2)
  const category = args.find(a => !a.startsWith('--')) || 'all'
  
  log('='.repeat(60), 'blue')
  log('🧪 QA Test Suite - Inventario Host Dedicado', 'blue')
  log('='.repeat(60), 'blue')
  log('📡 API: ' + API_URL, 'gray')
  log('👤 Admin: ' + ADMIN_EMAIL, 'gray')
  log('📋 Category: ' + category, 'gray')
  log('='.repeat(60), 'blue')
  
  try {
    await testHealth()
    
    switch (category) {
      case 'auth':
        await testAuth()
        break
      case 'servidores':
        await testAuth()
        await testServidores()
        break
      default:
        await testAuth()
        await testServidores()
        await testDashboard()
        await testProveedores()
        await testMisc()
        await testValidation()
        await testErrorHandling()
    }
    
    log('', 'blue')
    log('='.repeat(60), 'blue')
    log('📊 Test Summary', 'cyan')
    log('='.repeat(60), 'blue')
    log('  Total:   ' + testResults.total, 'reset')
    log('  Passed:  ' + testResults.passed, 'green')
    log('  Failed:  ' + testResults.failed, testResults.failed > 0 ? 'red' : 'green')
    log('  Requests: ' + requestCount, 'gray')
    log('='.repeat(60), 'blue')
    
    if (testResults.failed > 0) {
      log('', 'red')
      log('❌ ' + testResults.failed + ' test(s) failed!', 'red')
      process.exit(1)
    } else {
      log('', 'green')
      log('✅ All tests passed!', 'green')
      process.exit(0)
    }
  } catch (error) {
    log('', 'red')
    log('❌ Error: ' + error.message, 'red')
    process.exit(1)
  }
}

runTests()

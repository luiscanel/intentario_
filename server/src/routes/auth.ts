import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/index'
import { config } from '../config/index.js'
import { validate, loginSchema } from '../validations/index.js'
import { createAuditLog, getRequestInfo } from '../services/auditLogService.js'
import { sendEmail } from '../services/email.js'
import { authMiddleware } from '../middleware/auth.js'
import { log } from '../utils/logger.js'

const router = Router()

// El middleware de autenticación NO se aplica aquí porque /login debe ser público
// Las demás rutas que requieren auth se protegen individualmente

// Generar contraseña temporal segura
function generateTempPassword(): string {
  // Usar crypto-safe random en lugar de Math.random()
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$%'
  
  // Asegurar al menos un carácter de cada tipo
  const getRandomChar = (chars: string) => {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return chars[array[0] % chars.length]
  }
  
  let password = ''
  password += getRandomChar(uppercase)  // Al menos una mayúscula
  password += getRandomChar(lowercase)  // Al menos una minúscula
  password += getRandomChar(numbers)    // Al menos un número
  password += getRandomChar(special)    // Al menos un especial
  
  // Llenar el resto hasta 12 caracteres
  const allChars = uppercase + lowercase + numbers + special
  for (let i = 4; i < 12; i++) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    password += allChars[array[0] % allChars.length]
  }
  
  // Mezclar la contraseña de forma criptográficamente segura
  const array = new Uint32Array(password.length)
  crypto.getRandomValues(array)
  const mixed = password.split('').map((char, i) => ({ char, rand: array[i] }))
    .sort((a, b) => a.rand - b.rand)
    .map(item => item.char)
    .join('')
  
  return mixed
}

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const usuario = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        usuarioRoles: {
          include: {
            rol: {
              include: {
                permisos: { include: { modulo: true } },
                roles: { include: { modulo: true } }
              }
            }
          }
        }
      }
    })

    if (!usuario) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      })
    }

    if (!usuario.activo) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      })
    }

    // Verificar si la cuenta está bloqueada
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const tiempoRestante = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 1000 / 60)
      return res.status(423).json({ 
        success: false,
        message: `Cuenta bloqueada temporalmente. Intente en ${tiempoRestante} minutos.`,
        code: 'ACCOUNT_LOCKED'
      })
    }

    const validPassword = await bcrypt.compare(password, usuario.password)
    if (!validPassword) {
      // Incrementar intentos de login fallidos
      const nuevosIntentos = (usuario.intentosLogin || 0) + 1
      const ahora = new Date()
      
      // Si supera 5 intentos, bloquear por 15 minutos
      let datosActualizacion: any = {
        intentosLogin: nuevosIntentos,
        ultimoIntento: ahora
      }
      
      if (nuevosIntentos >= 5) {
        const tiempoBloqueo = new Date(ahora.getTime() + 15 * 60 * 1000) // 15 minutos
        datosActualizacion.bloqueadoHasta = tiempoBloqueo
        datosActualizacion.intentosLogin = 0 // Resetear contador tras bloquear
        
        // Registrar intento fallido en audit log
        createAuditLog({
          usuarioId: usuario.id,
          usuario: usuario.email,
          accion: 'login_failed',
          entidad: 'User',
          entidadId: usuario.id,
          datosNuevos: { intentos: nuevosIntentos, motivo: 'Demasiados intentos fallidos' },
          ...getRequestInfo(req)
        })
        
        await prisma.user.update({
          where: { id: usuario.id },
          data: datosActualizacion
        })
        
        return res.status(423).json({ 
          success: false,
          message: 'Cuenta bloqueada por múltiples intentos fallidos. Intente en 15 minutos.',
          code: 'ACCOUNT_LOCKED'
        })
      }
      
      await prisma.user.update({
        where: { id: usuario.id },
        data: datosActualizacion
      })
      
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Login exitoso: resetear contador de intentos
    await prisma.user.update({
      where: { id: usuario.id },
      data: {
        intentosLogin: 0,
        bloqueadoHasta: null,
        ultimoIntento: new Date(),
        ultimoAccesoActivo: new Date()
      }
    })

    // Extraer permisos únicos (de roles -> módulos -> permisos)
    const permisosSet = new Set<string>()
    const permisos: { modulo: string; accion: string }[] = []
    const modulosSet = new Set<string>()
    const modulos: string[] = []

    for (const ur of usuario.usuarioRoles) {
      // Extraer módulos del rol
      for (const rm of ur.rol.roles || []) {
        if (!modulosSet.has(rm.modulo.nombre)) {
          modulosSet.add(rm.modulo.nombre)
          modulos.push(rm.modulo.nombre)
        }
      }
      // Extraer permisos del rol
      for (const p of ur.rol.permisos || []) {
        const key = `${p.modulo.nombre}_${p.accion}`
        if (!permisosSet.has(key)) {
          permisosSet.add(key)
          permisos.push({ modulo: p.modulo.nombre, accion: p.accion })
        }
      }
    }

    // Extraer nombres de roles
    const roles = usuario.usuarioRoles.map(ur => ur.rol.nombre)

    // Generar token JWT (15 min para mayor seguridad)
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    )

    // Guardar sesión en la base de datos
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    await prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        token,
        ip,
        userAgent,
        expiresAt,
        activa: true
      }
    })

    // Enviar token en cookie httpOnly (segura)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutos en ms
      path: '/'
    })

    res.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        roles,
        modulos,
        permisos
      }
    })

    // Audit log de login
    createAuditLog({
      usuarioId: usuario.id,
      usuario: usuario.email,
      accion: 'login',
      entidad: 'User',
      entidadId: usuario.id,
      ...getRequestInfo(req)
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error del servidor',
      code: 'SERVER_ERROR'
    })
  }
})

// Renovar token y mantener sesión activa
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id
    
    // Actualizar último acceso activo
    await prisma.user.update({
      where: { id: userId },
      data: { ultimoAccesoActivo: new Date() }
    })
    
    // Generar nuevo token
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        usuarioRoles: {
          include: {
            rol: {
              include: {
                permisos: { include: { modulo: true } },
                roles: { include: { modulo: true } }
              }
            }
          }
        }
      }
    })
    
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    )
    
    res.json({ success: true, token })
  } catch (error) {
    console.error('Refresh error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

// Cambiar propia contraseña (usuario logueado)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado', code: 'UNAUTHORIZED' })
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Contraseñas requeridas', code: 'MISSING_FIELDS' })
    }

    const usuario = await prisma.user.findUnique({ where: { id: userId } })
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado', code: 'NOT_FOUND' })
    }

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, usuario.password)
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta', code: 'INVALID_PASSWORD' })
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        debeCambiarPass: false
      }
    })

    createAuditLog({
      usuarioId: usuario.id,
      usuario: usuario.email,
      accion: 'change_password',
      entidad: 'User',
      entidadId: usuario.id,
      ...getRequestInfo(req)
    })

    res.json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

// Resetear contraseña de un usuario (admin)
router.post('/reset-password/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const adminId = (req as any).user?.id
    const adminRol = (req as any).user?.rol

    // Verificar que es admin
    if (adminRol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo administradores', code: 'FORBIDDEN' })
    }

    const usuario = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado', code: 'NOT_FOUND' })
    }

    // Generar contraseña temporal
    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        password: hashedPassword,
        debeCambiarPass: true,
        passwordChangedAt: null
      }
    })

    // Enviar email con contraseña temporal
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } })
    let emailEnviado = false
    let emailErrorMsg = null
    
    try {
      await sendEmail(
        usuario.email,
        'Restablecimiento de contraseña - Inventario Almo',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hola ${usuario.nombre},</h2>
            <p>Un administrador ha restablecido tu contraseña.</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Tu contraseña temporal es:</strong></p>
              <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0;">${tempPassword}</p>
            </div>
            <p><strong>Importante:</strong> Esta contraseña es temporal y debes cambiarla en tu primer inicio de sesión.</p>
            <p>Saludos,<br>Equipo de Inventario Almo</p>
          </div>`
      )
      emailEnviado = true
    } catch (emailError) {
      emailErrorMsg = emailError instanceof Error ? emailError.message : 'Error desconocido'
      log.error('Error al enviar email de restablecimiento', { 
        usuario: usuario.email, 
        error: emailErrorMsg 
      })
    }

    createAuditLog({
      usuarioId: adminId,
      usuario: adminUser?.email,
      accion: 'reset_password',
      entidad: 'User',
      entidadId: parseInt(userId),
      datosNuevos: JSON.stringify({ email: usuario.email }),
      ...getRequestInfo(req)
    })

    // Construir respuesta
    const response: any = { 
      success: true, 
      message: `Contraseña reseteada${emailEnviado ? `. Se envió al correo ${usuario.email}` : ''}`
    }
    
    // Agregar warning si el email falló
    if (!emailEnviado) {
      response.warning = `No se pudo enviar el email. La contraseña temporal es: ${tempPassword}`
      response.emailError = emailErrorMsg
    }
    
    res.json(response)
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

// Cerrar sesión actual
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]

    if (token) {
      // Invalidar sesión en la base de datos
      await prisma.sesion.updateMany({
        where: {
          usuarioId: userId,
          token: token,
          activa: true
        },
        data: { activa: false }
      })
    }

    // Limpiar cookie
    res.clearCookie('token', { path: '/' })

    createAuditLog({
      usuarioId: userId,
      usuario: (req as any).user?.email,
      accion: 'logout',
      entidad: 'User',
      entidadId: userId,
      ...getRequestInfo(req)
    })

    res.json({ success: true, message: 'Sesión cerrada correctamente' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

// Obtener usuario actual (para verificar sesión)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user?.id

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        usuarioRoles: {
          include: {
            rol: {
              include: {
                permisos: { include: { modulo: true } },
                roles: { include: { modulo: true } }
              }
            }
          }
        }
      }
    })

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado', code: 'NOT_FOUND' })
    }

    // Extraer permisos únicos
    const permisosSet = new Set<string>()
    const permisos: { modulo: string; accion: string }[] = []
    const modulosSet = new Set<string>()
    const modulos: string[] = []

    for (const ur of usuario.usuarioRoles) {
      for (const rm of ur.rol.roles || []) {
        if (!modulosSet.has(rm.modulo.nombre)) {
          modulosSet.add(rm.modulo.nombre)
          modulos.push(rm.modulo.nombre)
        }
      }
      for (const p of ur.rol.permisos || []) {
        const key = `${p.modulo.nombre}_${p.accion}`
        if (!permisosSet.has(key)) {
          permisosSet.add(key)
          permisos.push({ modulo: p.modulo.nombre, accion: p.accion })
        }
      }
    }

    const roles = usuario.usuarioRoles.map(ur => ur.rol.nombre)

    res.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        roles,
        modulos,
        permisos
      }
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

// Cerrar todas las sesiones de un usuario (admin)
router.post('/logout-user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const adminId = (req as any).user?.id
    const adminRol = (req as any).user?.rol

    // Verificar que es admin
    if (adminRol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo administradores', code: 'FORBIDDEN' })
    }

    // Invalidar todas las sesiones del usuario
    const result = await prisma.sesion.updateMany({
      where: {
        usuarioId: parseInt(userId),
        activa: true
      },
      data: { activa: false }
    })

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } })

    createAuditLog({
      usuarioId: adminId,
      usuario: (req as any).user?.email,
      accion: 'logout_user',
      entidad: 'User',
      entidadId: parseInt(userId),
      datosNuevos: JSON.stringify({ email: targetUser?.email, sesionesCerradas: result.count }),
      ...getRequestInfo(req)
    })

    res.json({ 
      success: true, 
      message: `Se cerraron ${result.count} sesiones` 
    })
  } catch (error) {
    console.error('Logout user error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

export default router

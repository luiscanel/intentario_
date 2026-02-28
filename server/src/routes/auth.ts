import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/index'
import { config } from '../config/index.js'
import { validate, loginSchema } from '../validations/index.js'
import { createAuditLog, getRequestInfo } from '../services/auditLogService.js'
import { sendEmail } from '../services/email.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// El middleware de autenticación NO se aplica aquí porque /login debe ser público
// Las demás rutas que requieren auth se protegen individualmente

// Generar contraseña temporal
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
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

    const validPassword = await bcrypt.compare(password, usuario.password)
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      })
    }

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

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
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
    } catch (emailError) {
      console.error('Email error:', emailError)
      // No fallamos si el email falla, pero devolvemos warning
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

    res.json({ 
      success: true, 
      message: `Contraseña reseteada. Se envió al correo ${usuario.email}`,
      warning: 'Si el email no llega, verifica la configuración de correo'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: 'Error del servidor', code: 'SERVER_ERROR' })
  }
})

export default router

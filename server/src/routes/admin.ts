import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma/index'
import { authMiddleware, requireAdmin } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.use(requireAdmin)

// ============================================
// MÓDULOS
// ============================================

// Get all módulos
router.get('/modulos', async (req, res) => {
  try {
    const modulos = await prisma.modulo.findMany({
      include: {
        permisos: true,
        roles: { include: { rol: true } }
      },
      orderBy: { orden: 'asc' }
    })
    res.json({ success: true, data: modulos })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener módulos', code: 'FETCH_ERROR' })
  }
})

// Create módulo
router.post('/modulos', async (req, res) => {
  try {
    const { nombre, descripcion, icono, orden } = req.body

    const existing = await prisma.modulo.findUnique({ where: { nombre } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ya existe un módulo con ese nombre', code: 'DUPLICATE_MODULO' })
    }

    // Crear permisos base para el nuevo módulo
    const modulo = await prisma.modulo.create({
      data: {
        nombre,
        descripcion: descripcion || '',
        icono: icono || 'Circle',
        orden: orden || 0,
        activo: true,
        permisos: {
          create: [
            { accion: 'ver' },
            { accion: 'crear' },
            { accion: 'editar' },
            { accion: 'eliminar' },
            { accion: 'exportar' }
          ]
        }
      },
      include: { permisos: true }
    })

    res.status(201).json({ success: true, data: modulo })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear módulo', code: 'CREATE_ERROR' })
  }
})

// Update módulo
router.put('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, icono, orden, activo } = req.body

    const modulo = await prisma.modulo.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre || undefined,
        descripcion: descripcion ?? undefined,
        icono: icono || undefined,
        orden: orden || undefined,
        activo: activo ?? undefined
      },
      include: { permisos: true }
    })

    res.json({ success: true, data: modulo })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar módulo', code: 'UPDATE_ERROR' })
  }
})

// Delete módulo
router.delete('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar si hay roles usándolo
    const rolModulos = await prisma.rolModulo.count({ where: { moduloId: parseInt(id) } })
    if (rolModulos > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar un módulo que está asignado a roles',
        code: 'MODULO_IN_USE'
      })
    }

    await prisma.modulo.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Módulo eliminado correctamente' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar módulo', code: 'DELETE_ERROR' })
  }
})

// ============================================
// ROLES
// ============================================

// Get all roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      include: {
        roles: { include: { modulo: true } },
        usuarios: true
      },
      orderBy: { nombre: 'asc' }
    })
    res.json({ 
      success: true, 
      data: roles.map(r => ({
        ...r,
        usuariosCount: r.usuarios.length,
        modulos: r.roles.map(rm => rm.modulo)
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener roles', code: 'FETCH_ERROR' })
  }
})

// Get all permisos (agrupados por módulo)
router.get('/permisos', async (req, res) => {
  try {
    const modulos = await prisma.modulo.findMany({
      include: { permisos: true },
      orderBy: { orden: 'asc' }
    })
    
    const grouped: Record<string, any[]> = {}
    modulos.forEach(m => {
      grouped[m.nombre] = m.permisos.map(p => ({ id: p.id, accion: p.accion }))
    })
    
    res.json({ success: true, data: { modulos, grouped } })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener permisos', code: 'FETCH_ERROR' })
  }
})

// Create rol
router.post('/roles', async (req, res) => {
  try {
    const { nombre, descripcion, moduloIds } = req.body

    const existing = await prisma.rol.findUnique({ where: { nombre } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ya existe un rol con ese nombre', code: 'DUPLICATE_ROLE' })
    }

    const rol = await prisma.rol.create({
      data: {
        nombre,
        descripcion: descripcion || '',
        esBase: false,
        roles: moduloIds?.length ? {
          create: moduloIds.map((moduloId: number) => ({ moduloId }))
        } : undefined
      },
      include: { roles: { include: { modulo: true } } }
    })

    res.status(201).json({ success: true, data: rol })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear rol', code: 'CREATE_ERROR' })
  }
})

// Update rol
router.put('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, moduloIds } = req.body

    // Actualizar módulos del rol
    if (moduloIds !== undefined) {
      await prisma.rolModulo.deleteMany({ where: { rolId: parseInt(id) } })
      if (moduloIds.length > 0) {
        await prisma.rolModulo.createMany({
          data: moduloIds.map((moduloId: number) => ({ rolId: parseInt(id), moduloId }))
        })
      }
    }

    const updateData: any = {}
    if (nombre) updateData.nombre = nombre
    if (descripcion !== undefined) updateData.descripcion = descripcion

    const rol = await prisma.rol.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { roles: { include: { modulo: true } } }
    })

    res.json({ success: true, data: rol })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar rol', code: 'UPDATE_ERROR' })
  }
})

// Delete rol
router.delete('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const rol = await prisma.rol.findUnique({ where: { id: parseInt(id) } })
    if (rol?.esBase) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar un rol base del sistema',
        code: 'CANNOT_DELETE_BASE_ROLE'
      })
    }

    const usuariosConRol = await prisma.usuarioRol.count({ where: { rolId: parseInt(id) } })
    if (usuariosConRol > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar un rol que tiene usuarios asignados',
        code: 'ROLE_IN_USE'
      })
    }

    await prisma.rol.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Rol eliminado correctamente' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar rol', code: 'DELETE_ERROR' })
  }
})

// ============================================
// USUARIOS
// ============================================

// Get all usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.user.findMany({
      include: {
        usuarioRoles: { include: { rol: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ 
      success: true, 
      data: usuarios.map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
        createdAt: u.createdAt,
        roles: u.usuarioRoles.map(ur => ({ id: ur.rol.id, nombre: ur.rol.nombre }))
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', code: 'FETCH_ERROR' })
  }
})

// Create usuario
router.post('/usuarios', async (req, res) => {
  try {
    const { email, nombre, password, rolIds, activo, enviarInvitacion } = req.body

    // Generar contraseña temporal si no se proporciona
    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!'
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    const usuario = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        nombre,
        password: hashedPassword,
        rol: 'user',
        activo: activo !== false,
        debeCambiarPass: true, // Force password change on first login
        usuarioRoles: rolIds?.length ? {
          create: rolIds.map((rolId: number) => ({ rolId }))
        } : undefined
      }
    })

    // Enviar invitación por email si se solicita
    if (enviarInvitacion) {
      try {
        const { sendEmail } = await import('../services/email.js')
        await sendEmail(
          usuario.email,
          'Invitación a Inventario Almo',
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hola ${usuario.nombre},</h2>
              <p>Has sido invitado al sistema de Inventario Almo.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Tus credenciales de acceso:</strong></p>
                <p style="margin: 10px 0 0 0;">Email: <strong>${usuario.email}</strong></p>
                <p style="margin: 5px 0 0 0;">Contraseña temporal: <strong>${tempPassword}</strong></p>
              </div>
              <p><strong>Importante:</strong> Al iniciar sesión por primera vez, debes cambiar tu contraseña.</p>
              <p>Accede en: <a href="http://localhost:5174">http://localhost:5174</a></p>
              <p>Saludos,<br>Equipo de Inventario Almo</p>
            </div>`
        )
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt
      },
      invitacionEnviada: !!enviarInvitacion
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'El email ya está registrado', code: 'DUPLICATE_EMAIL' })
    }
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al crear usuario', code: 'CREATE_ERROR' })
  }
})

// Update usuario
router.put('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, activo, password, rolIds } = req.body

    const usuarioActual = await prisma.user.findUnique({ where: { id: parseInt(id) } })
    if (!usuarioActual) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado', code: 'NOT_FOUND' })
    }

    const updateData: any = {}
    if (nombre) updateData.nombre = nombre
    if (typeof activo === 'boolean') updateData.activo = activo
    if (password) updateData.password = await bcrypt.hash(password, 12)

    // Actualizar roles si se proporcionan
    if (rolIds !== undefined) {
      await prisma.usuarioRol.deleteMany({ where: { usuarioId: parseInt(id) } })
      if (rolIds.length > 0) {
        await prisma.usuarioRol.createMany({
          data: rolIds.map((rolId: number) => ({ usuarioId: parseInt(id), rolId }))
        })
      }
    }

    const usuario = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    res.json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', code: 'UPDATE_ERROR' })
  }
})

// Delete usuario
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const userId = (req as any).user?.id
    if (userId === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo', code: 'SELF_DELETE' })
    }

    await prisma.user.delete({ where: { id: parseInt(id) } })
    res.json({ success: true, message: 'Usuario eliminado correctamente' })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar usuario', code: 'DELETE_ERROR' })
  }
})

// ============================================
// OTROS
// ============================================

// Delete all servidores
router.delete('/servidores', async (req, res) => {
  try {
    await prisma.servidor.deleteMany({})
    res.json({ success: true, message: 'Todos los servidores eliminados' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ success: false, message: 'Error al eliminar servidores', code: 'DELETE_ERROR' })
  }
})

export default router

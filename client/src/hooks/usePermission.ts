import { useAuthStore } from '@/store/authStore'

/**
 * Hook para verificar permisos del usuario actual
 * @param modulo - Nombre del módulo a verificar
 * @param accion - Acción a verificar (ver, crear, editar, eliminar, exportar)
 * @returns true si el usuario tiene el permiso
 */
export function usePermission(modulo: string, accion?: string) {
  const user = useAuthStore((state) => state.user)
  
  if (!user) return false
  
  // Admin tiene todos los permisos
  if (user.roles?.includes('admin')) return true
  
  // Si no se especifica acción, verificar si tiene acceso al módulo
  if (!accion) {
    return user.modulos?.includes(modulo) || false
  }
  
  // Verificar permiso específico
  const permisoKey = `${modulo}_${accion}`
  return user.permisos?.some((p: any) => 
    (typeof p === 'string' && p === permisoKey) ||
    (p.modulo === modulo && p.accion === accion)
  ) || false
}

/**
 * Hook para verificar si el usuario tiene acceso a un módulo
 * @param modulo - Nombre del módulo
 * @returns true si tiene acceso
 */
export function useModuleAccess(modulo: string) {
  return usePermission(modulo)
}

/**
 * Hook para verificar si el usuario es admin
 */
export function useIsAdmin() {
  const user = useAuthStore((state) => state.user)
  return user?.roles?.includes('admin') || false
}

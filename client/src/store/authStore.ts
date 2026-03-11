import { create } from 'zustand'
import type { Permiso } from '@/types/api'

interface User {
  id: number
  email: string
  nombre: string
  rol: string
  roles?: string[]
  modulos?: string[]
  permisos?: Permiso[]
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  permisos: Permiso[]
  modulos: string[]
  login: (user: User) => void
  logout: () => void
  tienePermiso: (modulo: string, accion: string) => boolean
  tieneModulo: (modulo: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    isAuthenticated: false,
    user: null,
    permisos: [],
    modulos: [],
    login: (user) => {
      const permisos = user.permisos || []
      const modulos = user.modulos || []
      set({ isAuthenticated: true, user, permisos, modulos })
    },
    logout: () => set({ isAuthenticated: false, user: null, permisos: [], modulos: [] }),
    tienePermiso: (modulo: string, accion: string) => {
      const { permisos, user } = get()
      // Admin tiene todos los permisos
      if (user?.roles?.includes('admin')) return true
      return permisos.some(p => p.modulo === modulo && p.accion === accion)
    },
    tieneModulo: (modulo: string) => {
      const { modulos, user } = get()
      // Admin tiene todos los módulos
      if (user?.roles?.includes('admin')) return true
      return modulos.includes(modulo)
    },
  })
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  token: string | null
  permisos: Permiso[]
  modulos: string[]
  login: (user: User, token: string) => void
  logout: () => void
  tienePermiso: (modulo: string, accion: string) => boolean
  tieneModulo: (modulo: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      permisos: [],
      modulos: [],
      login: (user, token) => {
        const permisos = user.permisos || []
        const modulos = user.modulos || []
        set({ isAuthenticated: true, user, token, permisos, modulos })
      },
      logout: () => set({ isAuthenticated: false, user: null, token: null, permisos: [], modulos: [] }),
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
    }),
    {
      name: 'auth-storage',
    }
  )
)

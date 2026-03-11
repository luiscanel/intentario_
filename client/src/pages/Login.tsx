import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { } from '@/components/ui/card'
import { login } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'
import { Server, Lock, Mail, Eye, EyeOff, Shield, Activity, FileText, Database, Zap } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login: setAuth } = useAuthStore()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.toLowerCase().endsWith('@grupoalmo.com')) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'Solo se permiten correos con dominio @grupoalmo.com',
      })
      return
    }

    setLoading(true)
    try {
      const data = await login(email, password)
      setAuth(data.user)
      toast({
        title: 'Bienvenido',
        description: `Sesión iniciada como ${data.user.nombre}`,
      })
      navigate('/')
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: error.message || 'Credenciales inválidas',
      })
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    {
      title: 'Inventario',
      icon: Database,
      items: ['Servidores', 'Cloud', 'Físico']
    },
    {
      title: 'Monitoreo',
      icon: Activity,
      items: ['Disponibilidad', 'Alertas']
    },
    {
      title: 'Gestión',
      icon: FileText,
      items: ['Proveedores', 'Licencias', 'Contratos']
    },
    {
      title: 'Seguridad',
      icon: Shield,
      items: ['Certificados', 'Backups']
    }
  ]

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE - Features */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl"></div>
        
        {/* Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        <div className="relative z-10 flex flex-col justify-center p-16 w-full">
          {/* Logo & Brand */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-2xl shadow-blue-500/30">
                <Server className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Inventario Almo</h1>
                <p className="text-blue-300/70 text-lg mt-1">Sistema de Gestión de Infraestructura</p>
              </div>
            </div>
            <p className="text-blue-200/60 text-xl max-w-xl leading-relaxed">
              Controla y administra todos tus recursos tecnológicos en una sola plataforma.
              <span className="text-blue-400 font-medium"> Servidores, Cloud, Licencias y más.</span>
            </p>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-6 max-w-2xl">
            {categories.map((cat, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                  <cat.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{cat.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((item, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Highlight */}
          <div className="mt-10 flex items-center gap-3 text-blue-300/50">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm">Monitoreo en tiempo real • Alertas automáticas • Informes detallados</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Inventario Almo</span>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-sm mt-16 lg:mt-0">
          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-8 text-center">
              <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
              <p className="text-blue-100/80 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
            </div>
            
            {/* Card Body */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 text-sm font-semibold">Correo Electrónico</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@grupoalmo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 pl-12 pr-4 bg-gray-50 border-2 border-gray-100 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-0 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 text-sm font-semibold">Contraseña</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pl-12 pr-14 bg-gray-50 border-2 border-gray-100 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-0 rounded-xl transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>
                      Iniciar Sesión
                    </>
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400">
                  🔒 Solo usuarios <span className="font-medium text-gray-600">@grupoalmo.com</span> pueden acceder
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Copyright */}
          <p className="lg:hidden text-center text-gray-300 text-xs mt-6">
            © 2026 Grupo Almo
          </p>
        </div>
      </div>
    </div>
  )
}

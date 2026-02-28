import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Send, Save, TestTube, CheckCircle, XCircle } from 'lucide-react'

export default function Email() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    host: '',
    puerto: '587',
    usuario: '',
    contrasena: '',
    usandoTls: true,
    emailFrom: '',
    activo: true
  })
  const [testEmail, setTestEmail] = useState('')
  const [sendTo, setSendTo] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/config')
      const data = await res.json()
      if (data) {
        setFormData(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast({ title: 'Configuración guardada correctamente' })
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese un email de prueba' })
      return
    }
    setTesting(true)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Email de prueba enviado', description: 'Revise su bandeja de entrada' })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSendReport = async () => {
    if (!sendTo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingrese el destinatario' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendTo })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Informe enviado', description: 'El informe se envió correctamente' })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Email</h1>
        <p className="text-gray-500 mt-1">Configure el servidor de correo para enviar notificaciones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Servidor SMTP
            </CardTitle>
            <CardDescription>
              Configure los datos de su servidor de correo saliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Servidor SMTP (host)</Label>
                <Input 
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input 
                    value={formData.puerto}
                    onChange={(e) => setFormData({...formData, puerto: e.target.value})}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Input 
                    value={formData.usuario}
                    onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                    placeholder="correo@dominio.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input 
                  type="password"
                  value={formData.contrasena}
                  onChange={(e) => setFormData({...formData, contrasena: e.target.value})}
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500">
                  Deje en blanco para mantener la contraseña actual
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email Remitente</Label>
                <Input 
                  value={formData.emailFrom}
                  onChange={(e) => setFormData({...formData, emailFrom: e.target.value})}
                  placeholder="inventario@grupoalmo.com"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="tls"
                  checked={formData.usandoTls}
                  onChange={(e) => setFormData({...formData, usandoTls: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="tls" className="font-normal">Usar TLS/SSL</Label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="activo" className="font-normal">Configuración activa</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test & Send */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Probar Configuración
              </CardTitle>
              <CardDescription>
                Envíe un email de prueba para verificar la configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email de prueba</Label>
                <Input 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="correo@dominio.com"
                />
              </div>
              <Button 
                onClick={handleTest} 
                variant="outline" 
                className="w-full"
                disabled={testing}
              >
                <Send className="w-4 h-4 mr-2" />
                {testing ? 'Enviando...' : 'Enviar Email de Prueba'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Enviar Informe
              </CardTitle>
              <CardDescription>
                Envíe el inventario completo por email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <Input 
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="destinatario@dominio.com"
                />
              </div>
              <Button 
                onClick={handleSendReport} 
                className="w-full"
                disabled={sending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar Informe de Inventario'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status */}
      <Card className={formData.activo ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
        <CardContent className="p-4 flex items-center gap-3">
          {formData.activo ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Configuración de email activa</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600">Configuración de email inactiva</span>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

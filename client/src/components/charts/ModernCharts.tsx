import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

// Tooltip moderno
export const ModernTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm px-4 py-3 shadow-2xl rounded-xl border border-slate-700/50">
        <p className="text-slate-200 font-medium text-sm">{label}</p>
        <p className="text-blue-400 text-lg font-bold">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

// StatCard mejorado
export const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group border-0">
    <CardContent className="p-0">
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 ${color} opacity-90`}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
        <div className="relative flex items-center p-5">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Gráfico de dona moderno
export const DonutChartCard = ({ data, colors, title, icon: Icon, colorClass, dataKey = "value" }: any) => {
  const total = data.reduce((a: number, b: any) => a + (b[dataKey] || b.value || 0), 0)
  const gradientId = `donut-${title.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')}`
  
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {colors.map((color: string, index: number) => (
                  <linearGradient key={index} id={`${gradientId}-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey={dataKey}
                stroke="none"
              >
                {data.map((_: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#${gradientId}-${index % colors.length})`}
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<ModernTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
            <p className="text-3xl font-bold text-slate-700">{total}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Gráfico de barras moderno
export const BarChartCard = ({ data, title, icon: Icon, colorClass, dataKey = "count", layout = "horizontal", colors }: any) => {
  const gradientId = `bar-grad-${title.replace(/\s/g, '')}`
  
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={layout}>
              <defs>
                {colors ? (
                  colors.map((color: string, index: number) => (
                    <linearGradient key={index} id={`${gradientId}-${index}`} x1="0" y1="0" x2={layout === "vertical" ? "0" : "1"} y2={layout === "vertical" ? "1" : "0"}>
                      <stop offset="0%" stopColor={color} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                    </linearGradient>
                  ))
                ) : (
                  <linearGradient id={gradientId} x1="0" y1="0" x2={layout === "vertical" ? "0" : "1"} y2={layout === "vertical" ? "1" : "0"}>
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={layout === "vertical"} />
              {layout === "vertical" ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey={dataKey === "count" ? "name" : dataKey} type="category" width={100} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey={dataKey === "count" ? "name" : dataKey} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                </>
              )}
              <Tooltip content={<ModernTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar 
                dataKey={dataKey} 
                fill={`url(#${gradientId})`}
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Gráfico de barras con múltiples colores
export const MultiBarChartCard = ({ data, title, icon: Icon, colorClass, dataKey = "count" }: any) => {
  const gradientId = `multibar-grad-${title.replace(/\s/g, '')}`
  
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ModernTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-red-100 text-red-700",
        info: "bg-cyan-100 text-cyan-700",
        purple: "bg-purple-100 text-purple-700",
        secondary: "bg-slate-100 text-slate-700",
        outline: "border border-slate-200 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Estado badge helper
function EstadoBadge({ estado }: { estado: string }) {
  const variant = React.useMemo(() => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return 'success'
      case 'inactivo':
        return 'danger'
      case 'mantenimiento':
        return 'warning'
      case 'decomisionado':
        return 'secondary'
      default:
        return 'default'
    }
  }, [estado])

  return <Badge variant={variant}>{estado}</Badge>
}

// Priority/Level badge
function PrioridadBadge({ nivel }: { nivel: string }) {
  const variant = React.useMemo(() => {
    switch (nivel?.toLowerCase()) {
      case 'alto':
      case 'high':
        return 'danger'
      case 'medio':
      case 'medium':
        return 'warning'
      case 'bajo':
      case 'low':
        return 'success'
      default:
        return 'secondary'
    }
  }, [nivel])

  return <Badge variant={variant}>{nivel}</Badge>
}

export { Badge, badgeVariants, EstadoBadge, PrioridadBadge }

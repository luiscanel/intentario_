import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-lg bg-slate-200",
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      
      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  )
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-8 flex-1 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-12 flex-1 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-12 w-12 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-11 w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// Loading Spinner Component
function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }
  
  return (
    <div className={cn("relative", sizes[size], className)}>
      <div className={cn("absolute inset-0 rounded-full border-2 border-slate-200", sizes[size])} />
      <div className={cn("absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin")} />
    </div>
  )
}

// Full Page Loader
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-slate-500 text-sm animate-pulse">Cargando...</p>
      </div>
    </div>
  )
}

export { Skeleton, DashboardSkeleton, TableSkeleton, CardSkeleton, FormSkeleton, LoadingSpinner, PageLoader }

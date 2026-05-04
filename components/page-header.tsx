import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  className?: string
  gradient?: boolean
}

export function PageHeader({ title, description, icon, className, gradient = true }: PageHeaderProps) {
  return (
    <div className={cn("py-12 px-4 sm:px-6 lg:px-8", className)}>
      <div className="max-w-7xl mx-auto">
        {icon && <div className="mb-4">{icon}</div>}
        <h1 className={cn("text-4xl md:text-5xl lg:text-6xl font-bold mb-4", gradient && "text-gradient")}>{title}</h1>
        {description && (
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  )
}

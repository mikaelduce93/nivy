import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  description?: string
  className?: string
  centered?: boolean
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  description,
  className,
  centered = false,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-8", centered && "text-center", className)}>
      {badge && (
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3",
            centered && "mx-auto",
          )}
        >
          {badge}
        </div>
      )}
      {subtitle && <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-2">{subtitle}</p>}
      <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
      {description && <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  )
}

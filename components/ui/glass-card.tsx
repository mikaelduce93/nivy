import * as React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "panel"
  intensity?: "low" | "medium" | "high"
  neon?: "none" | "party" | "vitality" | "intellect" | "creativity" | "prestige"
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", intensity = "medium", neon = "none", ...props }, ref) => {
    const intensityClasses = {
      low: "bg-zinc-900/30 backdrop-blur-md",
      medium: "bg-zinc-900/50 backdrop-blur-xl",
      high: "bg-zinc-900/70 backdrop-blur-2xl",
    }

    const variantClasses = {
      default: "border border-white/10 shadow-xl",
      hover: "border border-white/10 shadow-xl transition-all duration-300 hover:bg-zinc-900/60 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl cursor-pointer",
      panel: "bg-black/60 backdrop-blur-2xl border border-white/5",
    }

    const neonClasses = {
      none: "",
      party: "neon-border-party",
      vitality: "neon-border-vitality",
      intellect: "neon-border-intellect",
      creativity: "neon-border-creativity",
      prestige: "neon-border-prestige",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-3xl",
          intensityClasses[intensity],
          variantClasses[variant],
          neonClasses[neon],
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }













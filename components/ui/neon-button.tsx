"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useHaptic } from "@/lib/hooks/use-haptic"

const neonButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-transform",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Neon Variants - Aligned with design tokens (--neon-*)
        // Colors match globals.css: party=violet, vitality=lime, intellect=cyan, creativity=coral, prestige=gold
        party: "bg-[color:var(--neon-party)] text-white shadow-[0_0_20px_-5px_var(--neon-party)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-party)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        vitality: "bg-[color:var(--neon-vitality)] text-zinc-900 shadow-[0_0_20px_-5px_var(--neon-vitality)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-vitality)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        intellect: "bg-[color:var(--neon-intellect)] text-white shadow-[0_0_20px_-5px_var(--neon-intellect)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-intellect)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        creativity: "bg-[color:var(--neon-creativity)] text-white shadow-[0_0_20px_-5px_var(--neon-creativity)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-creativity)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        prestige: "bg-[color:var(--neon-prestige)] text-zinc-900 shadow-[0_0_20px_-5px_var(--neon-prestige)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-prestige)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-lg px-3",
        lg: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-12 w-12",
      },
      glow: {
        true: "animate-pulse-slow",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: false,
    },
  }
)

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {
  asChild?: boolean
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, glow, asChild = false, onClick, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { trigger } = useHaptic()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) trigger("light")
      onClick?.(event)
    }

    return (
      <Comp
        className={cn(neonButtonVariants({ variant, size, glow, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      />
    )
  }
)
NeonButton.displayName = "NeonButton"

export { NeonButton, neonButtonVariants }













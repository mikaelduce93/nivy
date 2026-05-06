"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useJuice, type JuiceEvent } from "@/lib/hooks/use-juice"

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
        vitality: "bg-[color:var(--neon-vitality)] text-on-bright shadow-[0_0_20px_-5px_var(--neon-vitality)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-vitality)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        intellect: "bg-[color:var(--neon-intellect)] text-white shadow-[0_0_20px_-5px_var(--neon-intellect)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-intellect)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        creativity: "bg-[color:var(--neon-creativity)] text-white shadow-[0_0_20px_-5px_var(--neon-creativity)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-creativity)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
        prestige: "bg-[color:var(--neon-prestige)] text-on-bright shadow-[0_0_20px_-5px_var(--neon-prestige)] border border-white/20 hover:brightness-110 hover:shadow-[0_0_30px_-5px_var(--neon-prestige)] motion-safe:hover:scale-105 motion-safe:active:scale-95",
      },
      size: {
        // h-12 (48px) already exceeds 44px touch minimum
        default: "h-12 px-6 py-3",
        // sm visually 36px, but min-h/w-11 ensures the hit area stays at the 44px minimum
        sm: "h-9 min-h-11 min-w-11 rounded-lg px-3",
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
  /**
   * Override the JuiceEvent fired on click. Defaults are inferred from the
   * neon variant: party/prestige -> "success", default/destructive -> "click",
   * everything else -> "tap".
   */
  juice?: JuiceEvent | null
}

// Map a NeonButton variant to its semantic JuiceEvent. The neon variants are
// celebration-flavoured (party/prestige), so they earn a punchier signature.
function defaultJuiceForVariant(variant?: NeonButtonProps['variant']): JuiceEvent {
  switch (variant) {
    case 'party':
    case 'prestige':
      return 'success'
    case 'destructive':
      return 'click'
    case 'vitality':
    case 'creativity':
    case 'intellect':
      return 'tap'
    default:
      return 'click'
  }
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, glow, asChild = false, onClick, disabled, juice, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { play } = useJuice()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        const event_ = juice === undefined ? defaultJuiceForVariant(variant) : juice
        if (event_) play(event_)
      }
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













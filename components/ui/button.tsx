"use client"

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

// Gen-Z Button Styles: Bold, rounded, bouncy, with colored shadows
const buttonVariants = cva(
  [
    // Base styles - Gen-Z aesthetic
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-2xl text-sm font-semibold",
    "transition-all duration-200 ease-out",
    // Active state - bouncy feedback
    "active:scale-[0.96] active:translate-y-[1px]",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG handling
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    // Focus state - Gen-Z glow
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
    // Invalid state
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary - with colored shadow
        default: [
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--primary)]',
        ].join(' '),
        // Gen-Z Gradient - eye-catching
        gradient: [
          'bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime',
          'text-white font-bold',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_32px_-8px_var(--gen-z-lavender)]',
          'bg-[length:200%_100%] hover:bg-[position:100%_0]',
          'transition-all duration-300',
        ].join(' '),
        // Destructive
        destructive: [
          'bg-destructive text-white',
          'hover:bg-destructive/90 hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--destructive)]',
          'focus-visible:ring-destructive/40',
        ].join(' '),
        // Success
        success: [
          'bg-success text-success-foreground',
          'hover:bg-success/90 hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--success)]',
          'focus-visible:ring-success/40',
        ].join(' '),
        // Warning
        warning: [
          'bg-warning text-warning-foreground',
          'hover:bg-warning/90 hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--warning)]',
          'focus-visible:ring-warning/40',
        ].join(' '),
        // Outline - with hover fill
        outline: [
          'border-2 border-primary bg-transparent text-primary',
          'hover:bg-primary/10 hover:-translate-y-0.5',
          'hover:shadow-[0_4px_16px_-4px_var(--primary)]',
        ].join(' '),
        // Secondary - subtle
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80 hover:-translate-y-0.5',
        ].join(' '),
        // Ghost - minimal
        ghost: [
          'text-foreground',
          'hover:bg-muted hover:text-foreground',
        ].join(' '),
        // Link - underline
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
        // Gen-Z Pill colors
        lavender: [
          'bg-gen-z-lavender text-white',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--gen-z-lavender)]',
        ].join(' '),
        coral: [
          'bg-gen-z-coral text-white',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--gen-z-coral)]',
        ].join(' '),
        lime: [
          'bg-gen-z-lime text-on-bright',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--gen-z-lime)]',
        ].join(' '),
        mint: [
          'bg-gen-z-mint text-on-bright',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--gen-z-mint)]',
        ].join(' '),
        grape: [
          'bg-gen-z-grape text-white',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_var(--gen-z-grape)]',
        ].join(' '),
      },
      size: {
        default: 'h-10 px-5 py-2.5 has-[>svg]:px-4',
        sm: 'h-8 rounded-xl gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5',
        lg: 'h-12 rounded-2xl px-7 text-base has-[>svg]:px-5',
        xl: 'h-14 rounded-3xl px-10 text-lg font-bold has-[>svg]:px-7',
        icon: 'size-10 rounded-xl',
        'icon-sm': 'size-8 rounded-lg',
        'icon-lg': 'size-12 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

/* ==========================================================================
   PREMIUM BUTTON - With ripple, glow, loading states, and success animation
   ========================================================================== */

// Note: framer-motion's drag/animation handlers collide with HTML ones.
// Omit them in favour of motion's typed surface.
interface PremiumButtonProps
  extends Omit<
    React.ComponentProps<'button'>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  >,
  VariantProps<typeof buttonVariants> {
  loading?: boolean
  success?: boolean
  ripple?: boolean
  glow?: boolean
  glowColor?: string
  children: React.ReactNode
}

interface RippleState {
  x: number
  y: number
  id: number
}

function PremiumButton({
  className,
  variant = 'default',
  size,
  loading = false,
  success = false,
  ripple = true,
  glow = true,
  glowColor,
  children,
  disabled,
  onClick,
  ...props
}: PremiumButtonProps) {
  const [ripples, setRipples] = React.useState<RippleState[]>([])
  const [isHovered, setIsHovered] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const rippleIdRef = React.useRef(0)

  // Handle ripple effect on click
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && buttonRef.current && !loading && !disabled) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const newRipple = { x, y, id: rippleIdRef.current++ }
      setRipples(prev => [...prev, newRipple])
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }
    
    onClick?.(e)
  }

  // Determine glow color based on variant
  const getGlowColor = () => {
    if (glowColor) return glowColor
    switch (variant) {
      case 'lavender': return 'var(--gen-z-lavender)'
      case 'coral': return 'var(--gen-z-coral)'
      case 'lime': return 'var(--gen-z-lime)'
      case 'mint': return 'var(--gen-z-mint)'
      case 'grape': return 'var(--gen-z-grape)'
      case 'success': return 'var(--success)'
      case 'destructive': return 'var(--destructive)'
      case 'warning': return 'var(--warning)'
      default: return 'var(--primary)'
    }
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      ref={buttonRef}
      data-slot="premium-button"
      className={cn(
        buttonVariants({ variant, size }),
        'relative overflow-hidden',
        className
      )}
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {/* Glow effect */}
      {glow && (
        <motion.div
          className="absolute inset-0 -z-10 rounded-[inherit] pointer-events-none"
          style={{
            background: getGlowColor(),
            filter: 'blur(20px)',
          }}
          animate={{
            opacity: isHovered ? 0.4 : 0,
            scale: isHovered ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Content with state transitions */}
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
          <motion.span
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="size-4" />
            </motion.div>
            Done!
          </motion.span>
        ) : loading ? (
          <motion.span
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="size-4" />
            </motion.div>
            <span className="sr-only">Loading...</span>
          </motion.span>
        ) : (
          <motion.span
            key="content"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Shimmer effect on hover */}
      {isHovered && !isDisabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  )
}

/* ==========================================================================
   MAGNETIC BUTTON - Button that attracts cursor
   ========================================================================== */

interface MagneticButtonProps
  extends Omit<
    React.ComponentProps<'button'>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  >,
  VariantProps<typeof buttonVariants> {
  strength?: number
  children: React.ReactNode
}

function MagneticButton({
  className,
  variant,
  size,
  strength = 0.3,
  children,
  ...props
}: MagneticButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const x = (e.clientX - centerX) * strength
    const y = (e.clientY - centerY) * strength
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={buttonRef}
      className={cn(buttonVariants({ variant, size }), className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export { Button, PremiumButton, MagneticButton, buttonVariants }

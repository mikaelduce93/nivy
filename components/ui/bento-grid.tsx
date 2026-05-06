"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

/* ==========================================================================
   BENTO GRID - Silicon Valley Grade Premium Cards
   
   Features:
   - Advanced 3D perspective tilt
   - Cursor-following spotlight/glow
   - Staggered reveal animations
   - Multiple visual variants
   - Depth-based layering
   - Grain/noise texture overlay
   ========================================================================== */

// Note: framer-motion's `onDrag` (PanInfo-based) collides with React's HTML
// drag handler signature. Omit the HTML drag handlers in favour of motion.
interface BentoGridProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  > {
  children: React.ReactNode
  className?: string
  /** Stagger animation for children */
  stagger?: boolean
  staggerDelay?: number
}

/**
 * A flexible grid system for creating organic "Bento" layouts.
 */
export function BentoGrid({ 
  children, 
  className, 
  stagger = true,
  staggerDelay = 0.1,
  ...props 
}: BentoGridProps) {
  return (
    <motion.div
      className={cn(
        "grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-6 auto-rows-[minmax(160px,auto)] md:auto-rows-[minmax(180px,auto)]",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger ? staggerDelay : 0,
          }
        }
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface BentoCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  /** Grid column span (1-12) */
  cols?: number | string
  /** Grid row span */
  rows?: number | string
  /** Intensity of the tilt effect (0 to disable) */
  tiltIntensity?: number
  /** Visual variant */
  variant?: "default" | "glass" | "glow" | "accent" | "premium"
  /** Enable spotlight effect */
  spotlight?: boolean
  /** Spotlight color */
  spotlightColor?: string
  /** Enable border glow on hover */
  borderGlow?: boolean
  /** Custom border glow color */
  borderGlowColor?: string
}

/**
 * A card optimized for Bento layouts with built-in 3D effects and premium interactions.
 */
export function BentoCard({
  children,
  className,
  cols = 1,
  rows = 1,
  tiltIntensity = 8,
  variant = "default",
  spotlight = true,
  spotlightColor = "rgba(255, 255, 255, 0.1)",
  borderGlow = true,
  borderGlowColor,
  ...props
}: BentoCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  
  // 3D tilt motion values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Smooth spring physics for tilt
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [tiltIntensity, -tiltIntensity]),
    { stiffness: 300, damping: 30 }
  )
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-tiltIntensity, tiltIntensity]),
    { stiffness: 300, damping: 30 }
  )
  
  // Spotlight position
  const spotlightX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 150, damping: 20 })
  const spotlightY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 150, damping: 20 })
  const spotlightBackground = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) => `radial-gradient(300px circle at ${x}% ${y}%, ${spotlightColor}, transparent 60%)`
  )
  const reflectionTransform = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `translate(${Number(x) * 20}px, ${Number(y) * 20}px)`
  )
  
  // Scale on hover
  const scale = useSpring(isHovered ? 1.02 : 1, { stiffness: 400, damping: 30 })
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || tiltIntensity === 0) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }
  
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  // Map spans to tailwind classes
  const spanClass = cn(
    typeof cols === "number" ? `md:col-span-${Math.min(cols, 8)} lg:col-span-${cols}` : cols,
    typeof rows === "number" ? `row-span-${rows}` : rows,
    "col-span-1" // Default for mobile
  )

  const variantClasses = {
    default: "bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl",
    glass: "bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl",
    glow: "bg-card/90 backdrop-blur-xl border border-primary/20 shadow-[0_0_40px_-10px_var(--primary-glow)]",
    accent: "bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/30",
    premium: "bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl",
  }

  // Determine border glow color based on variant
  const getGlowColor = () => {
    if (borderGlowColor) return borderGlowColor
    switch (variant) {
      case 'glow': return 'var(--primary)'
      case 'accent': return 'var(--accent)'
      case 'premium': return '#8b5cf6'
      default: return '#8b5cf6'
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn("group h-full", spanClass)}
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
          }
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
      }}
      {...props}
    >
      <motion.div
        className="h-full w-full"
        style={{
          rotateX: tiltIntensity > 0 ? rotateX : 0,
          rotateY: tiltIntensity > 0 ? rotateY : 0,
          scale,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 transition-all duration-300",
            variantClasses[variant],
            isHovered && borderGlow && "shadow-[0_0_30px_-5px_var(--glow-color)]",
            className
          )}
          style={{
            '--glow-color': getGlowColor(),
          } as React.CSSProperties}
        >
          {/* Decorative background noise/grain */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[inherit]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Spotlight effect */}
          {spotlight && (
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
              style={{
                background: spotlightBackground,
              }}
            />
          )}
          
          {/* Border glow effect */}
          {borderGlow && (
            <motion.div
              className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, ${getGlowColor()}20, transparent 50%, ${getGlowColor()}10)`,
              }}
            />
          )}
          
          {/* Dynamic reflection overlay */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              transform: reflectionTransform,
            }}
          />
          
          {/* Shimmer on hover */}
          {isHovered && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          )}
          
          {/* Content with 3D depth */}
          <div 
            className="relative z-10 h-full flex flex-col"
            style={{ transform: 'translateZ(20px)' }}
          >
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   BENTO CARD HEADER - Consistent header styling for cards
   ========================================================================== */

interface BentoCardHeaderProps {
  icon?: React.ReactNode
  iconClassName?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function BentoCardHeader({
  icon,
  iconClassName,
  title,
  subtitle,
  action,
  className,
}: BentoCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <motion.div 
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              iconClassName || "bg-white/10"
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {icon}
          </motion.div>
        )}
        <div>
          <h3 className="font-bold text-white text-base md:text-lg tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-white/50 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ==========================================================================
   BENTO CARD CONTENT - Flexible content area
   ========================================================================== */

interface BentoCardContentProps {
  children: React.ReactNode
  className?: string
  centered?: boolean
}

export function BentoCardContent({
  children,
  className,
  centered = false,
}: BentoCardContentProps) {
  return (
    <div 
      className={cn(
        "flex-1",
        centered && "flex items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   BENTO CARD FOOTER - Bottom action area
   ========================================================================== */

interface BentoCardFooterProps {
  children: React.ReactNode
  className?: string
}

export function BentoCardFooter({
  children,
  className,
}: BentoCardFooterProps) {
  return (
    <div className={cn("mt-auto pt-4 border-t border-white/5", className)}>
      {children}
    </div>
  )
}

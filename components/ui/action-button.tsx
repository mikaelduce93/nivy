'use client'

/* ==========================================================================
   UNIFIED ACTION BUTTON - Consolidates all action button variants
   
   Replaces:
   - action-bubble.tsx
   - action-button.tsx  
   - hyper-action-button.tsx
   
   Provides a single, accessible, performant action button component.
   ========================================================================== */

import * as React from 'react'
import Link from 'next/link'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Cake,
  Users,
  Sparkles,
  Map as MapIcon,
  Zap,
  Trophy,
  Calendar,
  BookOpen,
  Target,
  Heart,
} from 'lucide-react'

/* ==========================================================================
   TYPES
   ========================================================================== */

export type ActionVariant = 'bubble' | 'card' | 'inline'
export type ActionSize = 'sm' | 'md' | 'lg'
export type ActionIconType = 
  | 'cake' 
  | 'users' 
  | 'sparkles' 
  | 'map' 
  | 'zap' 
  | 'trophy'
  | 'calendar'
  | 'book'
  | 'target'
  | 'heart'

export interface ActionButtonProps {
  /** Navigation URL */
  href: string
  /** Icon type or component */
  icon?: ActionIconType | LucideIcon
  /** Alternative: iconType for legacy support */
  iconType?: ActionIconType
  /** Label text */
  label: string
  /** Visual variant */
  variant?: ActionVariant
  /** Size */
  size?: ActionSize
  /** Background color class */
  color?: string
  /** Shadow class */
  shadow?: string
  /** Notification badge */
  badge?: number
  /** Disable hover effects for reduced motion */
  disableEffects?: boolean
  /** Accessible description */
  description?: string
  /** Custom className */
  className?: string
  /** Click handler (in addition to navigation) */
  onClick?: () => void
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<ActionIconType, LucideIcon> = {
  cake: Cake,
  users: Users,
  sparkles: Sparkles,
  map: MapIcon,
  zap: Zap,
  trophy: Trophy,
  calendar: Calendar,
  book: BookOpen,
  target: Target,
  heart: Heart,
}

/* ==========================================================================
   SIZE CONFIGURATIONS
   ========================================================================== */

const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16 sm:w-20 sm:h-20',
    icon: 'w-7 h-7 sm:w-8 sm:h-8',
    label: 'text-[9px] sm:text-[10px]',
    gap: 'gap-3',
  },
  md: {
    container: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
    icon: 'w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12',
    label: 'text-[10px] sm:text-[11px] md:text-xs',
    gap: 'gap-4',
  },
  lg: {
    container: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32',
    icon: 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14',
    label: 'text-[10px] sm:text-xs md:text-sm',
    gap: 'gap-5',
  },
} as const

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ActionButton({
  href,
  icon,
  iconType,
  label,
  variant = 'bubble',
  size = 'md',
  color = 'bg-gen-z-lavender',
  shadow = 'shadow-xl',
  badge,
  disableEffects = false,
  description,
  className,
  onClick,
}: ActionButtonProps) {
  // Resolve icon
  const IconComponent: LucideIcon = React.useMemo(() => {
    if (typeof icon === 'function') return icon
    if (icon && icon in ICON_MAP) return ICON_MAP[icon]
    if (iconType && iconType in ICON_MAP) return ICON_MAP[iconType]
    return Sparkles
  }, [icon, iconType])
  
  const sizeConfig = SIZE_CONFIG[size]
  
  // Check for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  const shouldAnimate = !disableEffects && !prefersReducedMotion
  
  // Content based on variant
  const renderContent = () => {
    switch (variant) {
      case 'bubble':
        return (
          <BubbleContent
            Icon={IconComponent}
            label={label}
            color={color}
            shadow={shadow}
            badge={badge}
            sizeConfig={sizeConfig}
            shouldAnimate={shouldAnimate}
          />
        )
      case 'card':
        return (
          <CardContent
            Icon={IconComponent}
            label={label}
            color={color}
            badge={badge}
            sizeConfig={sizeConfig}
            shouldAnimate={shouldAnimate}
          />
        )
      case 'inline':
        return (
          <InlineContent
            Icon={IconComponent}
            label={label}
            color={color}
            badge={badge}
            shouldAnimate={shouldAnimate}
          />
        )
    }
  }
  
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={description || label}
      className={cn(
        'group relative flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.15_290)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.08_0.015_290)] rounded-full',
        sizeConfig.gap,
        className
      )}
    >
      {renderContent()}
    </Link>
  )
}

/* ==========================================================================
   VARIANT CONTENTS
   ========================================================================== */

interface ContentProps {
  Icon: LucideIcon
  label: string
  color: string
  shadow?: string
  badge?: number
  sizeConfig?: typeof SIZE_CONFIG.md
  shouldAnimate: boolean
}

function BubbleContent({ 
  Icon, 
  label, 
  color, 
  shadow, 
  badge,
  sizeConfig = SIZE_CONFIG.md,
  shouldAnimate,
}: ContentProps) {
  return (
    <>
      {/* Outer glow on hover */}
      <div
        className={cn(
          'absolute -inset-4 rounded-full opacity-0 blur-2xl transition-opacity duration-500',
          'group-hover:opacity-40',
          color
        )}
      />
      
      {/* Main bubble */}
      <motion.div
        whileHover={shouldAnimate ? { scale: 1.15, rotate: [0, -5, 5, 0] } : undefined}
        whileTap={shouldAnimate ? { scale: 0.9 } : undefined}
        transition={{ duration: 0.3 }}
        className={cn(
          'relative rounded-full flex items-center justify-center',
          'border-4 border-white/10 group-hover:border-white/40',
          'transition-all duration-500 overflow-hidden',
          sizeConfig.container,
          color,
          shadow
        )}
      >
        {/* Background pulse */}
        {shouldAnimate && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-white"
          />
        )}
        
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Icon */}
        <Icon className={cn(sizeConfig.icon, 'text-black relative z-10 drop-shadow-lg')} />
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-zinc-900 z-20">
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </motion.div>
      
      {/* Label */}
      <div className="flex flex-col items-center space-y-1 relative z-10">
        <span
          className={cn(
            'font-black text-center uppercase tracking-[0.2em] text-zinc-500',
            'group-hover:text-white transition-colors duration-300',
            sizeConfig.label
          )}
        >
          {label}
        </span>
        {shouldAnimate && (
          <motion.div
            className={cn('h-1 rounded-full', color)}
            initial={{ width: 0 }}
            whileHover={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </>
  )
}

function CardContent({
  Icon,
  label,
  color,
  badge,
  sizeConfig = SIZE_CONFIG.md,
  shouldAnimate,
}: ContentProps) {
  return (
    <motion.div
      whileHover={shouldAnimate ? { scale: 1.05, y: -4 } : undefined}
      whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
      className={cn(
        'relative p-4 sm:p-5 rounded-2xl overflow-hidden',
        'border border-white/10 group-hover:border-white/20',
        'transition-all duration-300',
        'bg-white/5 group-hover:bg-white/10'
      )}
    >
      {/* Color accent */}
      <div
        className={cn(
          'absolute top-0 left-0 w-full h-1',
          color
        )}
      />
      
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'p-3 rounded-xl flex items-center justify-center',
            color,
            'bg-opacity-20'
          )}
        >
          <Icon className={cn(sizeConfig?.icon || 'w-6 h-6', 'text-white')} />
        </div>
        
        <span className="text-sm font-bold text-white text-center">{label}</span>
      </div>
      
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </div>
      )}
    </motion.div>
  )
}

function InlineContent({
  Icon,
  label,
  color,
  badge,
  shouldAnimate,
}: ContentProps) {
  return (
    <motion.div
      whileHover={shouldAnimate ? { x: 4 } : undefined}
      className="flex items-center gap-3 p-2 -m-2 rounded-lg group-hover:bg-white/5 transition-colors"
    >
      <div
        className={cn(
          'p-2 rounded-lg flex items-center justify-center relative',
          color,
          'bg-opacity-20'
        )}
      >
        <Icon className="w-5 h-5 text-white" />
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </div>
        )}
      </div>
      
      <span className="text-sm font-medium text-white group-hover:text-gen-z-lavender transition-colors">
        {label}
      </span>
    </motion.div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default ActionButton

// Legacy exports for backwards compatibility
export { ActionButton as ActionBubble, ActionButton as HyperActionButton }

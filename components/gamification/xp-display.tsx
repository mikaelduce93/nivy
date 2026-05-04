'use client'

import { motion } from 'framer-motion'
import { Coins, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedCounter } from '@/components/ui/animated-counter'

interface XPValueDisplayProps {
  xp: number
  showIcon?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'badge' | 'minimal'
}

export function XPValueDisplay({ 
  xp, 
  showIcon = true, 
  className,
  size = 'md',
  variant = 'default'
}: XPValueDisplayProps) {
  // Conversion rate: 1 XP = 0.10 DH
  const valueInDh = Math.floor(xp * 0.10)
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  }

  if (variant === 'minimal') {
    return (
      <span className={cn("font-mono text-emerald-400", sizeClasses[size], className)}>
        <AnimatedCounter value={xp} suffix=" XP" /> <span className="text-zinc-500">≈ <AnimatedCounter value={valueInDh} suffix=" DH" /></span>
      </span>
    )
  }

  if (variant === 'badge') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20",
        className
      )}>
        <span className={cn("font-bold text-emerald-400", sizeClasses[size])}>
          <AnimatedCounter value={xp} suffix=" XP" />
        </span>
        <span className="w-px h-3 bg-emerald-500/20" />
        <span className={cn("font-bold text-yellow-400 flex items-center gap-1", sizeClasses[size])}>
          <AnimatedCounter value={valueInDh} suffix=" DH" />
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-1.5">
        {showIcon && <Zap className="w-4 h-4 text-emerald-400" />}
        <span className={cn("font-black text-white", sizeClasses[size])}>
          <AnimatedCounter value={xp} suffix=" XP" />
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-yellow-400/80 font-medium">
        <Coins className="w-3 h-3" />
        <span>Valeur : <AnimatedCounter value={valueInDh} suffix=" MAD" /></span>
      </div>
    </div>
  )
}


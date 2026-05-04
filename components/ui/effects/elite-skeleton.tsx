'use client'

import * as React from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   ELITE SKELETON SYSTEM - Silicon Valley Grade Loading States
   
   Premium loading experiences with:
   - Morphing skeletons that transform into content
   - Staggered cascade reveals
   - Shimmer with depth layers
   - Content-aware shapes
   - Smooth transition to real content
   - Ambient particle loading
   ========================================================================== */

interface EliteSkeletonProps {
  className?: string
  /** Shimmer color */
  shimmerColor?: string
  /** Background color */
  backgroundColor?: string
  /** Enable glow effect */
  glow?: boolean
  glowColor?: string
  /** Border radius */
  borderRadius?: number
}

export function EliteSkeleton({
  className,
  shimmerColor = 'rgba(255, 255, 255, 0.1)',
  backgroundColor = 'rgba(255, 255, 255, 0.05)',
  glow = false,
  glowColor = 'rgba(139, 92, 246, 0.2)',
  borderRadius = 8,
}: EliteSkeletonProps) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundColor,
        borderRadius,
        boxShadow: glow ? `0 0 30px ${glowColor}` : undefined,
      }}
    >
      {/* Multi-layer shimmer */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            ${shimmerColor} 20%,
            ${shimmerColor.replace('0.1', '0.2')} 50%,
            ${shimmerColor} 80%,
            transparent 100%
          )`,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary shimmer (offset) */}
      <motion.div
        className="absolute inset-0 opacity-50"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          )`,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
    </div>
  )
}

/* ==========================================================================
   MORPHING SKELETON - Transforms smoothly into content
   ========================================================================== */

interface MorphingSkeletonProps {
  children: React.ReactNode
  isLoading: boolean
  className?: string
  /** Skeleton configuration */
  skeleton?: {
    width?: string | number
    height?: string | number
    borderRadius?: number
  }
  /** Duration of morph transition */
  duration?: number
}

export function MorphingSkeleton({
  children,
  isLoading,
  className,
  skeleton = { height: 100, borderRadius: 16 },
  duration = 0.6,
}: MorphingSkeletonProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          className={className}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            filter: 'blur(8px)',
          }}
          transition={{ duration: duration / 2 }}
        >
          <EliteSkeleton
            className="w-full"
            style={{
              width: skeleton.width || '100%',
              height: skeleton.height,
            }}
            borderRadius={skeleton.borderRadius || 16}
            glow
          />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          className={className}
          initial={{
            opacity: 0,
            scale: 0.98,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: duration,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   STAGGERED SKELETON - Cascade loading effect
   ========================================================================== */

interface StaggeredSkeletonProps {
  count: number
  className?: string
  itemClassName?: string
  /** Height of each skeleton item */
  itemHeight?: number | string
  /** Gap between items */
  gap?: number
  /** Stagger delay between items */
  staggerDelay?: number
  /** Variant pattern */
  variant?: 'uniform' | 'varied' | 'card'
}

export function StaggeredSkeleton({
  count,
  className,
  itemClassName,
  itemHeight = 60,
  gap = 12,
  staggerDelay = 0.1,
  variant = 'uniform',
}: StaggeredSkeletonProps) {
  const getItemStyle = (index: number) => {
    switch (variant) {
      case 'varied':
        return {
          height: typeof itemHeight === 'number' 
            ? itemHeight * (0.6 + Math.random() * 0.8) 
            : itemHeight,
          width: `${70 + Math.random() * 30}%`,
        }
      case 'card':
        return {
          height: typeof itemHeight === 'number' ? itemHeight * 1.5 : itemHeight,
          width: '100%',
        }
      default:
        return {
          height: itemHeight,
          width: '100%',
        }
    }
  }

  return (
    <div className={cn('flex flex-col', className)} style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={itemClassName}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.4,
            delay: i * staggerDelay,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <EliteSkeleton
            style={getItemStyle(i)}
            borderRadius={variant === 'card' ? 16 : 8}
            glow={variant === 'card'}
          />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   HERO SKELETON - Dashboard hero loading state
   ========================================================================== */

interface HeroSkeletonProps {
  className?: string
}

export function HeroSkeleton({ className }: HeroSkeletonProps) {
  return (
    <motion.div
      className={cn('relative p-6 sm:p-8 rounded-3xl overflow-hidden', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="flex items-center gap-6">
        {/* Avatar skeleton */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <EliteSkeleton
            className="w-20 h-20 sm:w-24 sm:h-24"
            borderRadius={999}
            glow
            glowColor="rgba(139, 92, 246, 0.3)"
          />
        </motion.div>

        {/* Text skeletons */}
        <div className="flex-1 space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <EliteSkeleton className="h-4 w-20" borderRadius={4} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <EliteSkeleton className="h-8 w-40" borderRadius={6} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <EliteSkeleton className="h-6 w-32" borderRadius={16} glow />
          </motion.div>
        </div>

        {/* Stats skeleton (desktop) */}
        <div className="hidden sm:flex items-center gap-3">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <EliteSkeleton
                className="w-24 h-20"
                borderRadius={16}
                glow
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* XP bar skeleton */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex justify-between mb-2">
          <EliteSkeleton className="h-4 w-24" borderRadius={4} />
          <EliteSkeleton className="h-4 w-32" borderRadius={4} />
        </div>
        <EliteSkeleton className="h-4 w-full" borderRadius={8} glow />
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   CARD SKELETON - Individual card loading state
   ========================================================================== */

interface CardSkeletonProps {
  className?: string
  hasImage?: boolean
  hasTitle?: boolean
  hasDescription?: boolean
  hasFooter?: boolean
}

export function CardSkeleton({
  className,
  hasImage = false,
  hasTitle = true,
  hasDescription = true,
  hasFooter = false,
}: CardSkeletonProps) {
  return (
    <motion.div
      className={cn('p-4 rounded-2xl overflow-hidden', className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {hasImage && (
        <EliteSkeleton className="w-full h-32 mb-4" borderRadius={12} />
      )}

      {hasTitle && (
        <EliteSkeleton className="h-6 w-3/4 mb-3" borderRadius={4} />
      )}

      {hasDescription && (
        <div className="space-y-2">
          <EliteSkeleton className="h-4 w-full" borderRadius={4} />
          <EliteSkeleton className="h-4 w-5/6" borderRadius={4} />
        </div>
      )}

      {hasFooter && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <EliteSkeleton className="h-8 w-20" borderRadius={8} />
          <EliteSkeleton className="h-8 w-24" borderRadius={8} glow />
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   GRID SKELETON - Grid of cards loading state
   ========================================================================== */

interface GridSkeletonProps {
  count?: number
  columns?: number
  className?: string
  cardVariant?: 'default' | 'image' | 'full'
}

export function GridSkeleton({
  count = 6,
  columns = 3,
  className,
  cardVariant = 'default',
}: GridSkeletonProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.08,
            duration: 0.4,
          }}
        >
          <CardSkeleton
            hasImage={cardVariant === 'image' || cardVariant === 'full'}
            hasFooter={cardVariant === 'full'}
          />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   PULSE LOADER - Animated loading indicator
   ========================================================================== */

interface PulseLoaderProps {
  className?: string
  color?: string
  size?: number
  count?: number
}

export function PulseLoader({
  className,
  color = '#8b5cf6',
  size = 12,
  count = 3,
}: PulseLoaderProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            boxShadow: `0 0 ${size}px ${color}50`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   ORBIT LOADER - Orbiting particles
   ========================================================================== */

interface OrbitLoaderProps {
  className?: string
  color?: string
  size?: number
  orbitCount?: number
}

export function OrbitLoader({
  className,
  color = '#8b5cf6',
  size = 60,
  orbitCount = 3,
}: OrbitLoaderProps) {
  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
    >
      {/* Center glow */}
      <motion.div
        className="absolute inset-1/4 rounded-full"
        style={{
          background: color,
          filter: `blur(${size / 10}px)`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Orbiting particles */}
      {Array.from({ length: orbitCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <motion.div
            className="absolute rounded-full"
            style={{
              width: size / 6,
              height: size / 6,
              backgroundColor: color,
              boxShadow: `0 0 ${size / 4}px ${color}`,
              left: '50%',
              top: 0,
              marginLeft: -(size / 12),
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export type {
  EliteSkeletonProps,
  MorphingSkeletonProps,
  StaggeredSkeletonProps,
  HeroSkeletonProps,
  CardSkeletonProps,
  GridSkeletonProps,
  PulseLoaderProps,
  OrbitLoaderProps,
}

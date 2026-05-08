'use client'

/* ==========================================================================
   DASHBOARD SKELETONS - Premium Loading States

   Consistent loading skeletons for dashboard components.
   Builds on the shared Skeleton primitive (see `@/components/ui/skeleton`)
   to keep a single visual language for loading states across the app.
   ========================================================================== */

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Skeleton as SkeletonPrimitive } from '@/components/ui/skeleton'

/* ==========================================================================
   BASE SKELETON (re-exported)
   --------------------------------------------------------------------------
   Wraps the canonical primitive so existing dashboard imports keep working
   while collapsing onto a single animation/style implementation.
   ========================================================================== */

interface SkeletonProps {
  className?: string
  /** kept for API back-compat — animation is always on in the primitive */
  animate?: boolean
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <SkeletonPrimitive className={className} style={style} />
}

/* ==========================================================================
   HERO SKELETON
   ========================================================================== */

export function HeroSkeleton() {
  return (
    <div className="rounded-3xl bg-card/80 border border-white/5 p-5 sm:p-7 md:p-9">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Avatar */}
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full shrink-0" />
        
        {/* Name and status */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Stats */}
        <div className="hidden sm:flex gap-3">
          <Skeleton className="w-24 h-20 rounded-2xl" />
          <Skeleton className="w-24 h-20 rounded-2xl" />
        </div>
      </div>
      
      {/* XP Bar */}
      <div className="mt-6 sm:mt-8 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-full rounded-full" />
      </div>
    </div>
  )
}

/* ==========================================================================
   BENTO CARD SKELETON
   ========================================================================== */

interface BentoCardSkeletonProps {
  className?: string
  lines?: number
}

export function BentoCardSkeleton({ className, lines = 3 }: BentoCardSkeletonProps) {
  return (
    <div className={cn('rounded-2xl bg-card/50 border border-white/5 p-4 sm:p-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      
      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3"
            style={{ width: `${100 - i * 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   PRIORITY MISSION SKELETON
   ========================================================================== */

export function PriorityMissionSkeleton() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-card/90 to-card border border-border/50 p-4 sm:p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          
          {/* Progress */}
          <div className="pt-2">
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   QUICK ACCESS SKELETON
   ========================================================================== */

export function QuickAccessSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-card/50 p-4 space-y-3 flex flex-col items-center"
        >
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   ONLINE FRIENDS SKELETON
   ========================================================================== */

export function OnlineFriendsSkeleton() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Avatars */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-14 h-14 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   CREW HUB SKELETON
   ========================================================================== */

export function CrewHubSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Members */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-8 h-8 rounded-full" />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   MAP PREVIEW SKELETON
   ========================================================================== */

export function MapPreviewSkeleton() {
  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl bg-card/80">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Pulse animation */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-32 h-32 rounded-full bg-brand-soft/10 blur-xl" />
      </motion.div>

      {/* Center marker */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Skeleton className="w-4 h-4 rounded-full" />
      </div>

      {/* Fake markers */}
      <div className="absolute top-1/4 left-1/4">
        <Skeleton className="w-3 h-3 rounded-full" />
      </div>
      <div className="absolute top-1/3 right-1/3">
        <Skeleton className="w-3 h-3 rounded-full" />
      </div>
      <div className="absolute bottom-1/4 right-1/4">
        <Skeleton className="w-3 h-3 rounded-full" />
      </div>
    </div>
  )
}

/* ==========================================================================
   SOCIAL FEED SKELETON
   ========================================================================== */

export function SocialFeedSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   PROFILE QUEST SKELETON
   ========================================================================== */

export function ProfileQuestSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-12" />
      </div>
      
      <Skeleton className="h-2 w-full rounded-full" />
      
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   FULL DASHBOARD SKELETON
   ========================================================================== */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Hero */}
      <HeroSkeleton />
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        <div className="md:col-span-6">
          <PriorityMissionSkeleton />
        </div>
        <div className="md:col-span-3">
          <QuickAccessSkeleton />
        </div>
        <div className="md:col-span-3">
          <OnlineFriendsSkeleton />
        </div>
        <div className="md:col-span-5">
          <MapPreviewSkeleton />
        </div>
        <div className="md:col-span-7">
          <CrewHubSkeleton />
        </div>
        <div className="md:col-span-4">
          <ProfileQuestSkeleton />
        </div>
        <div className="md:col-span-8">
          <BentoCardSkeleton lines={5} />
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  Skeleton,
  HeroSkeleton,
  BentoCardSkeleton,
  PriorityMissionSkeleton,
  QuickAccessSkeleton,
  OnlineFriendsSkeleton,
  CrewHubSkeleton,
  MapPreviewSkeleton,
  SocialFeedSkeleton,
  ProfileQuestSkeleton,
  DashboardSkeleton,
}

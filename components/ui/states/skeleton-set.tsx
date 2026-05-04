'use client'

/**
 * TEENS PARTY MOROCCO - Skeleton Set Components
 * =============================================
 *
 * Ensembles de skeletons pré-configurés pour différents
 * types de contenu (cards, lists, profiles, etc.)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/* ==========================================================================
   BASE SKELETON COMPONENTS
   ========================================================================== */

interface SkeletonProps {
  className?: string
}

/** Skeleton pour texte d'une ligne */
export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full', className)} />
}

/** Skeleton pour titre */
export function SkeletonTitle({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-6 w-3/4', className)} />
}

/** Skeleton pour avatar */
export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />
}

/** Skeleton pour bouton */
export function SkeletonButton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-24 rounded-lg', className)} />
}

/** Skeleton pour image */
export function SkeletonImage({ className }: SkeletonProps) {
  return <Skeleton className={cn('aspect-video w-full rounded-lg', className)} />
}

/* ==========================================================================
   COMPOSITE SKELETON SETS
   ========================================================================== */

interface SkeletonSetProps {
  /** Number of items to render */
  count?: number
  className?: string
}

/** Skeleton pour une carte événement */
export function SkeletonEventCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

/** Skeleton pour une grille de cartes événements */
export function SkeletonEventGrid({ count = 6, className }: SkeletonSetProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonEventCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton pour un élément de liste */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b border-border', className)}>
      <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  )
}

/** Skeleton pour une liste */
export function SkeletonList({ count = 5, className }: SkeletonSetProps) {
  return (
    <div className={cn('divide-y divide-border rounded-xl border border-border bg-card', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} className="border-b-0" />
      ))}
    </div>
  )
}

/** Skeleton pour un profil utilisateur */
export function SkeletonProfile({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/** Skeleton pour un formulaire */
export function SkeletonForm({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {/* Submit button */}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

/** Skeleton pour une carte de statistiques */
export function SkeletonStatCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

/** Skeleton pour une grille de stats */
export function SkeletonStatsGrid({ count = 4, className }: SkeletonSetProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton pour un tableau */
export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-4 py-3 flex gap-4 border-t border-border">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Skeleton pour une carte de réservation/ticket */
export function SkeletonTicketCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      <div className="flex">
        <Skeleton className="w-24 h-full min-h-[120px]" />
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="p-4 border-l border-border border-dashed flex flex-col items-center justify-center gap-2">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton pour une liste de tickets */
export function SkeletonTicketList({ count = 3, className }: SkeletonSetProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTicketCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton pour un dashboard complet */
export function SkeletonDashboard({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Stats */}
      <SkeletonStatsGrid count={4} />
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-6 w-32 mb-4" />
          <SkeletonEventGrid count={4} className="grid-cols-1 md:grid-cols-2" />
        </div>
        <div>
          <Skeleton className="h-6 w-32 mb-4" />
          <SkeletonList count={4} />
        </div>
      </div>
    </div>
  )
}

/** Skeleton pour une page d'article/blog */
export function SkeletonArticle({ className }: SkeletonProps) {
  return (
    <div className={cn('max-w-3xl mx-auto space-y-8', className)}>
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      {/* Image */}
      <Skeleton className="aspect-video w-full rounded-xl" />
      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}

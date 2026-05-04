/**
 * TEENS PARTY MOROCCO - Page Skeleton Components
 * ==============================================
 *
 * Composants réutilisables pour les skeletons de chargement des pages
 * Réduit la duplication de code dans les fichiers loading.tsx
 */

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/* ==========================================================================
   PAGE SKELETON
   ========================================================================== */

interface PageSkeletonProps {
  /** Header skeleton configuration */
  header?: {
    title?: boolean
    subtitle?: boolean
    description?: boolean
    search?: boolean
  }
  /** Show filters skeleton */
  showFilters?: boolean
  /** Content skeleton type */
  content?: 'grid' | 'list' | 'cards' | 'custom'
  /** Number of items in grid/list */
  itemCount?: number
  /** Grid columns (for grid/cards) */
  columns?: 1 | 2 | 3 | 4
  /** Custom className */
  className?: string
  /** Padding top (for navbar offset) */
  paddingTop?: boolean
}

export function PageSkeleton({
  header = { title: true, subtitle: true },
  showFilters = false,
  content = 'grid',
  itemCount = 6,
  columns = 3,
  className,
  paddingTop = true,
}: PageSkeletonProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      paddingTop && "pt-24 pb-16",
      className
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        {(header.title || header.subtitle || header.description) && (
          <div className="text-center mb-12">
            {header.title && (
              <Skeleton className="h-8 w-48 mx-auto mb-4 rounded-full" />
            )}
            {header.subtitle && (
              <Skeleton className="h-12 w-80 mx-auto mb-4" />
            )}
            {header.description && (
              <Skeleton className="h-6 w-96 mx-auto" />
            )}
            {header.search && (
              <div className="max-w-4xl mx-auto mt-8">
                <Skeleton className="h-12 w-full" />
              </div>
            )}
          </div>
        )}

        {/* Filters Skeleton */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Skeleton className="flex-1 h-12" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        )}

        {/* Content Skeleton */}
        {content === 'grid' && (
          <GridSkeleton itemCount={itemCount} columns={columns} />
        )}
        {content === 'list' && (
          <ListSkeleton itemCount={itemCount} />
        )}
        {content === 'cards' && (
          <CardsSkeleton itemCount={itemCount} columns={columns} />
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   GRID SKELETON
   ========================================================================== */

interface GridSkeletonProps {
  itemCount?: number
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function GridSkeleton({
  itemCount = 6,
  columns = 3,
  className,
}: GridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn("grid gap-6", gridCols[columns], className)}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/* ==========================================================================
   CARDS SKELETON
   ========================================================================== */

interface CardsSkeletonProps {
  itemCount?: number
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function CardsSkeleton({
  itemCount = 6,
  columns = 3,
  className,
}: CardsSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn("grid gap-8 max-w-7xl mx-auto", gridCols[columns], className)}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="rounded-3xl overflow-hidden border border-border">
          <Skeleton className="h-64 w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   LIST SKELETON
   ========================================================================== */

interface ListSkeletonProps {
  itemCount?: number
  className?: string
}

export function ListSkeleton({
  itemCount = 6,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ==========================================================================
   CARD SKELETON
   ========================================================================== */

interface CardSkeletonProps {
  showImage?: boolean
  showActions?: boolean
  className?: string
}

export function CardSkeleton({
  showImage = true,
  showActions = true,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {showImage && <Skeleton className="h-48 w-full" />}
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        {showActions && (
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        )}
      </div>
    </Card>
  )
}

/* ==========================================================================
   HEADER SKELETON
   ========================================================================== */

interface HeaderSkeletonProps {
  showTitle?: boolean
  showSubtitle?: boolean
  showDescription?: boolean
  showSearch?: boolean
  className?: string
}

export function HeaderSkeleton({
  showTitle = true,
  showSubtitle = true,
  showDescription = false,
  showSearch = false,
  className,
}: HeaderSkeletonProps) {
  return (
    <div className={cn("text-center mb-12", className)}>
      {showTitle && (
        <Skeleton className="h-8 w-48 mx-auto mb-4 rounded-full" />
      )}
      {showSubtitle && (
        <Skeleton className="h-12 w-80 mx-auto mb-4" />
      )}
      {showDescription && (
        <Skeleton className="h-6 w-96 mx-auto mb-4" />
      )}
      {showSearch && (
        <div className="max-w-4xl mx-auto mt-8">
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   FILTERS SKELETON
   ========================================================================== */

interface FiltersSkeletonProps {
  showSearch?: boolean
  filterCount?: number
  className?: string
}

export function FiltersSkeleton({
  showSearch = true,
  filterCount = 3,
  className,
}: FiltersSkeletonProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 mb-6", className)}>
      {showSearch && <Skeleton className="flex-1 h-12" />}
      <div className="flex gap-2">
        {Array.from({ length: filterCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
    </div>
  )
}








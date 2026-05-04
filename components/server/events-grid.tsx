/**
 * TEENS PARTY MOROCCO - Events Grid (Server Component)
 * ====================================================
 *
 * Grille d'événements rendue côté serveur.
 * Récupère les données directement depuis la base de données.
 */

import { Suspense } from 'react'
import { getUpcomingEvents, getFeaturedEvents } from '@/lib/server'
import { EventCard, EventCardSkeleton } from './event-card'
import { EmptyState } from '@/components/ui/states'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface EventsGridProps {
  /** Type de grille */
  variant?: 'default' | 'featured' | 'compact'
  /** Nombre de colonnes */
  columns?: 2 | 3 | 4
  /** Limite d'événements à afficher */
  limit?: number
  /** Afficher uniquement les événements en vedette */
  featuredOnly?: boolean
  /** Classes additionnelles */
  className?: string
  /** Titre de la section */
  title?: string
  /** Afficher le lien "Voir tout" */
  showViewAll?: boolean
}

/* ==========================================================================
   EVENTS GRID LOADING SKELETON
   ========================================================================== */

function EventsGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number
  columns?: 2 | 3 | 4
}) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid grid-cols-1 gap-6', gridCols[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* ==========================================================================
   EVENTS GRID CONTENT (async server component)
   ========================================================================== */

async function EventsGridContent({
  variant = 'default',
  columns = 3,
  limit = 6,
  featuredOnly = false,
}: Omit<EventsGridProps, 'className' | 'title' | 'showViewAll'>) {
  // Fetch data server-side
  const events = featuredOnly
    ? await getFeaturedEvents(limit)
    : (await getUpcomingEvents({ limit })).data

  // Empty state
  if (!events || events.length === 0) {
    return (
      <EmptyState
        preset="events"
        action={{
          label: 'Voir l\'agenda',
          href: '/agenda',
        }}
      />
    )
  }

  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid grid-cols-1 gap-6', gridCols[columns])}>
      {events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          variant={variant === 'featured' ? 'featured' : 'default'}
          priority={index < 2} // Priority for first 2 images (LCP)
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   EVENTS GRID COMPONENT (with Suspense)
   ========================================================================== */

export function EventsGrid({
  variant = 'default',
  columns = 3,
  limit = 6,
  featuredOnly = false,
  className,
  title,
  showViewAll = false,
}: EventsGridProps) {
  return (
    <section className={className}>
      {/* Header */}
      {(title || showViewAll) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          )}
          {showViewAll && (
            <a
              href="/agenda"
              className="text-sm text-primary hover:underline"
            >
              Voir tout →
            </a>
          )}
        </div>
      )}

      {/* Grid with Suspense */}
      <Suspense fallback={<EventsGridSkeleton count={limit} columns={columns} />}>
        <EventsGridContent
          variant={variant}
          columns={columns}
          limit={limit}
          featuredOnly={featuredOnly}
        />
      </Suspense>
    </section>
  )
}

/* ==========================================================================
   FEATURED EVENTS SECTION (pre-configured)
   ========================================================================== */

export function FeaturedEventsSection({ className }: { className?: string }) {
  return (
    <EventsGrid
      variant="featured"
      columns={3}
      limit={3}
      featuredOnly
      title="Événements en vedette"
      showViewAll
      className={className}
    />
  )
}

/* ==========================================================================
   UPCOMING EVENTS SECTION (pre-configured)
   ========================================================================== */

export function UpcomingEventsSection({ className }: { className?: string }) {
  return (
    <EventsGrid
      variant="default"
      columns={4}
      limit={8}
      title="Prochains événements"
      showViewAll
      className={className}
    />
  )
}

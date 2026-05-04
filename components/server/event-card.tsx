/**
 * TEENS PARTY MOROCCO - Event Card (Server Component)
 * ===================================================
 *
 * Carte d'événement rendue côté serveur.
 * N'utilise PAS 'use client' - c'est un Server Component pur.
 */

import Link from 'next/link'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OptimizedEventImage } from './optimized-event-image'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Event {
  id: string
  title: string
  slug?: string
  description?: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  city?: string
  price?: number
  capacity?: number
  spots_remaining?: number
  image_url?: string
  is_featured?: boolean
  is_sold_out?: boolean
  category?: string
}

interface EventCardProps {
  event: Event
  /** Variant de la carte */
  variant?: 'default' | 'compact' | 'featured'
  /** Classes additionnelles */
  className?: string
  /** Priorité de l'image (pour LCP) */
  priority?: boolean
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function formatTime(timeString?: string): string {
  if (!timeString) return ''
  return timeString.slice(0, 5) // HH:MM
}

function formatPrice(price?: number): string {
  if (!price || price === 0) return 'Gratuit'
  return `${price} DH`
}

/* ==========================================================================
   EVENT CARD COMPONENT (Server)
   ========================================================================== */

export function EventCard({
  event,
  variant = 'default',
  className,
  priority = false,
}: EventCardProps) {
  const eventUrl = `/evenements/${event.slug || event.id}`

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link
        href={eventUrl}
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg border border-border',
          'bg-card hover:bg-muted/50 transition-colors',
          className
        )}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <OptimizedEventImage
            src={event.image_url}
            alt={event.title}
            width={64}
            height={64}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {event.title}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {formatDate(event.event_date)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-primary">
            {formatPrice(event.price)}
          </span>
        </div>
      </Link>
    )
  }

  // Featured variant - Gen-Z styled
  if (variant === 'featured') {
    return (
      <article
        className={cn(
          'group relative rounded-3xl overflow-hidden border border-border/50',
          'bg-card hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
          'hover:-translate-y-1',
          className
        )}
      >
        {/* Image with Gen-Z gradient overlay */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <OptimizedEventImage
            src={event.image_url}
            alt={event.title}
            fill
            priority={priority}
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Gen-Z gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-gen-z-lavender/10 via-transparent to-gen-z-coral/10 opacity-60" />

          {/* Badges overlay - Gen-Z styled */}
          <div className="absolute top-4 left-4 flex gap-2">
            {event.is_featured && (
              <Badge variant="gradient" className="shadow-lg">
                ✨ En vedette
              </Badge>
            )}
            {event.is_sold_out && (
              <Badge variant="destructive" className="shadow-lg">🔥 Complet</Badge>
            )}
            {event.category && (
              <Badge variant="glass">{event.category}</Badge>
            )}
          </div>

          {/* Price overlay - Gen-Z pill */}
          <div className="absolute bottom-4 right-4">
            <span className="px-4 py-2 rounded-2xl bg-card/90 backdrop-blur-xl text-sm font-bold shadow-lg border border-border/50">
              {formatPrice(event.price)}
            </span>
          </div>
        </div>

        {/* Content - Gen-Z styled */}
        <div className="p-6">
          <h3 className="text-xl font-black text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Meta info - Gen-Z styled pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gen-z-lavender/10 text-gen-z-lavender text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(event.event_date)}
            </span>
            {event.start_time && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gen-z-coral/10 text-gen-z-coral text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(event.start_time)}
              </span>
            )}
            {event.city && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gen-z-mint/10 text-gen-z-mint text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                {event.city}
              </span>
            )}
            {event.spots_remaining !== undefined && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gen-z-lime/10 text-gen-z-lime text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                {event.spots_remaining} places
              </span>
            )}
          </div>

          {/* CTA - Gen-Z button */}
          <Link href={eventUrl}>
            <Button 
              className="w-full rounded-2xl font-bold" 
              size="lg"
              variant={event.is_sold_out ? 'outline' : 'default'}
              disabled={event.is_sold_out}
            >
              {event.is_sold_out ? '🔒 Complet' : '🎉 Réserver'}
            </Button>
          </Link>
        </div>
      </article>
    )
  }

  // Default variant - Gen-Z styled
  return (
    <article
      className={cn(
        'group rounded-2xl overflow-hidden border border-border/50',
        'bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300',
        'hover:-translate-y-1',
        className
      )}
    >
      {/* Image with hover zoom */}
      <Link href={eventUrl} className="block relative aspect-[4/3] overflow-hidden">
        <OptimizedEventImage
          src={event.image_url}
          alt={event.title}
          fill
          priority={priority}
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Gen-Z gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {event.is_sold_out && (
            <Badge variant="destructive" className="shadow-md">🔥 Complet</Badge>
          )}
        </div>
        
        {/* Price tag */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-xl bg-card/80 backdrop-blur-sm text-xs font-bold shadow-md">
            {formatPrice(event.price)}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={eventUrl}>
          <h3 className="font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Meta - Gen-Z styled */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-gen-z-lavender" />
            {formatDate(event.event_date)}
            {event.start_time && ` à ${formatTime(event.start_time)}`}
          </span>
          {event.city && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-gen-z-coral" />
              {event.city}
            </span>
          )}
        </div>

        {/* Footer */}
        <Link href={eventUrl} className="block">
          <Button 
            size="sm" 
            variant={event.is_sold_out ? 'outline' : 'default'} 
            disabled={event.is_sold_out}
            className="w-full rounded-xl font-semibold"
          >
            {event.is_sold_out ? 'Complet' : 'Voir l\'événement →'}
          </Button>
        </Link>
      </div>
    </article>
  )
}

/* ==========================================================================
   EVENT CARD SKELETON (Server)
   ========================================================================== */

export function EventCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'featured' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
        <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex justify-between pt-3 border-t border-border">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

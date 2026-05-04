/**
 * TEENS PARTY MOROCCO - Server Components
 * =======================================
 *
 * Export centralisé des Server Components.
 *
 * Ces composants sont rendus côté serveur et n'incluent PAS de JavaScript client.
 * Ils sont optimaux pour:
 * - Affichage de données statiques ou dynamiques
 * - SEO (contenu indexable)
 * - Performance (pas de JS bundle côté client)
 */

// Event components
export { EventCard, EventCardSkeleton } from './event-card'
export { EventsGrid, FeaturedEventsSection, UpcomingEventsSection } from './events-grid'

// Image components
export {
  OptimizedEventImage,
  AvatarImage,
  HeroImage,
  ThumbnailImage,
} from './optimized-event-image'

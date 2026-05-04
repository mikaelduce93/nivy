/**
 * FEED COMPONENTS
 * ================
 * Composants pour le fil d'actualités
 *
 * Composants:
 * - ActivityFeed: Fil d'actualités complet avec filtres
 * - FeedWidget: Widget compact pour dashboard
 * - PostComposer: Création de nouveaux posts
 * - TrendingHashtags: Widget des hashtags tendance
 *
 * Usage:
 * ```tsx
 * import {
 *   ActivityFeed,
 *   FeedWidget,
 *   PostComposer,
 *   TrendingHashtags,
 * } from "@/components/feed"
 * ```
 */

// Activity Feed
export {
  ActivityFeed,
  FeedWidget,
} from "./activity-feed"

// Post Composer
export {
  PostComposer,
  TrendingHashtags,
} from "./post-composer"

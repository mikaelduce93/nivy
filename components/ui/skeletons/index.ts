/**
 * NIVY — Skeletons barrel
 * =======================
 *
 * Two preferred entry points (TICKET-005):
 *   1. `atoms`    → primitive bricks (Bar, Circle, Image, Text)
 *   2. `presets`  → composed shapes (Card, List, Form, Stats, Hero,
 *                   DefiCard, AvatarCoach, TwinCurrencyGauge, …)
 *
 * Legacy exports (PageSkeleton, dashboard-skeletons) are re-exported here
 * for back-compat and will be progressively replaced by `presets`.
 */

/* --- new entry points (TICKET-005) ---------------------------------------- */
export {
  SkeletonBar,
  SkeletonCircle,
  SkeletonImage,
  SkeletonText,
  SkeletonAtoms,
  SKELETON_BASE,
} from './atoms'

export {
  // generic presets
  SkeletonCard as SkeletonPresetCard,
  SkeletonList as SkeletonPresetList,
  SkeletonForm as SkeletonPresetForm,
  SkeletonStats as SkeletonPresetStats,
  SkeletonHero as SkeletonPresetHero,
  // component-matching presets
  SkeletonDefiCard,
  SkeletonAvatarCoach,
  SkeletonTwinCurrencyGauge,
  // namespace alias
  SkeletonPresets,
} from './presets'

/* --- legacy: page-skeleton (back-compat) ---------------------------------- */
export {
  PageSkeleton,
  GridSkeleton,
  CardsSkeleton,
  ListSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  FiltersSkeleton,
} from './page-skeleton'

/* --- page-skeletons (TICKET-032 / W3-A10) --------------------------------- */
export { TeenDashboardSkeleton } from './page-skeletons/teen-dashboard-skeleton'
export { ParentDashboardSkeleton } from './page-skeletons/parent-dashboard-skeleton'
export { PartnerDashboardSkeleton } from './page-skeletons/partner-dashboard-skeleton'

/* --- legacy: dashboard-skeletons (back-compat) ---------------------------- */
export {
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
} from './dashboard-skeletons'

/* --- #72: unified entry point — re-export ALL skeleton layers here ---------
 * Aliased named re-exports (never `export *`) to avoid name collisions with the
 * layers above. New code should import skeletons only from this barrel. */

// Primitive (components/ui/skeleton.tsx).
export { Skeleton as SkeletonPrimitive } from '../skeleton'

// Transition cross-fade (components/ui/morphing-skeleton.tsx) — the canonical
// MorphingSkeleton (NOT the homonym in skeleton-variants).
export { MorphingSkeleton, MorphingSkeletonCompat } from '../morphing-skeleton'

// Premium framer-motion variants (components/ui/skeleton-variants.tsx).
// Homonyms are suffixed `Premium`; non-colliding ones pass through.
export {
  Skeleton as SkeletonPremium,
  HeroSkeleton as HeroSkeletonPremium,
  CardSkeleton as CardSkeletonPremium,
  QuickAccessSkeleton as QuickAccessSkeletonPremium,
  DashboardSkeleton as DashboardSkeletonPremium,
  MapSkeleton,
  FeedSkeleton,
  SocialHubSkeleton,
  SkeletonContainer,
  SkeletonItem,
} from '../skeleton-variants'

// Composite presets (components/ui/states/skeleton-set.tsx). SkeletonText/Image
// collide with `atoms` above → suffixed `Set`.
export {
  SkeletonEventCard,
  SkeletonEventGrid,
  SkeletonTicketCard,
  SkeletonTicketList,
  SkeletonProfile,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonStatsGrid,
  SkeletonForm,
  SkeletonDashboard,
  SkeletonArticle,
  SkeletonListItem,
  SkeletonList,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonTitle,
  SkeletonText as SkeletonSetText,
  SkeletonImage as SkeletonSetImage,
} from '../states/skeleton-set'

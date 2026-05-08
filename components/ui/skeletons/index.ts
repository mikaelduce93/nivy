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

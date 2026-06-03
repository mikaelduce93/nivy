/**
 * TEENS PARTY MOROCCO - UI States Components
 * ==========================================
 *
 * Export centralisé de tous les composants d'états UI.
 *
 * Usage:
 * import { EmptyState, ErrorBlock, Loading, StateWrapper } from '@/components/ui/states'
 */

// Empty State
export { EmptyState } from './empty-state'

// Error Block
export { ErrorBlock } from './error-block'

// Loading
export {
  Loading,
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingOverlay,
  ButtonLoading,
} from './loading'

// Offline Indicator
export {
  OfflineBanner,
  OfflineIndicator,
  OfflinePage,
  OfflineWrapper,
  useOnlineStatus,
} from './offline-indicator'

// Skeleton Sets
// @deprecated #72 — import skeletons from the single barrel
// `@/components/ui/skeletons` instead of this `states` barrel.
export {
  // Base skeletons
  SkeletonText,
  SkeletonTitle,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
  // Composite skeletons
  SkeletonEventCard,
  SkeletonEventGrid,
  SkeletonListItem,
  SkeletonList,
  SkeletonProfile,
  SkeletonForm,
  SkeletonStatCard,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonTicketCard,
  SkeletonTicketList,
  SkeletonDashboard,
  SkeletonArticle,
} from './skeleton-set'

// State Wrapper
export {
  StateWrapper,
  AsyncStateWrapper,
  QueryStateWrapper,
} from './state-wrapper'

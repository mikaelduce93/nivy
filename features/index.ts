/**
 * TEENS PARTY MOROCCO - Features Index
 * ====================================
 *
 * Export centralisé de tous les domaines métier.
 *
 * Structure:
 * - features/teens/        - Profils enfants
 * - features/anniversaires/ - Commandes anniversaires
 * - features/gamification/  - XP, Streaks, Challenges
 * - features/pass/          - Pass VIP
 *
 * Usage:
 * ```ts
 * import { createTeen, type Teen } from '@/features/teens'
 * import { createAnnivOrder, type AnnivOrder } from '@/features/anniversaires'
 * import { addXP, getTeenXP } from '@/features/gamification'
 * import { subscribeToPass, PASS_TIERS } from '@/features/pass'
 * ```
 *
 * NOTE: Each domain has its own ActionResult type.
 * Import from specific domains to avoid conflicts:
 * import { type ActionResult } from '@/features/teens'
 */

// Export domains as namespaces to avoid naming conflicts
export * as teens from './teens'
export * as anniversaires from './anniversaires'
export * as gamification from './gamification'
export * as pass from './pass'
export * as payments from './payments'

// Common ActionResult type (generic version)
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

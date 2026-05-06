/**
 * TEENS PARTY MOROCCO - Adaptive Difficulty
 * =========================================
 *
 * Selectionne la difficulte des prochains defis quotidiens en fonction
 * du taux de completion recent de l'utilisateur (audit AUDIT_LEVEL_UP_ET_DEFIS
 * Phase 2.2).
 *
 * Thresholds (taux de completion sur les 7 derniers defis):
 *   > 0.80      -> 'hard'   (xp x1.5)
 *   0.40 - 0.80 -> 'medium' (xp x1.0)
 *   < 0.40      -> 'easy'   (xp x0.8)
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface UserChallengeStats {
  /** Nombre total de defis sur la fenetre (ex: 7 derniers jours) */
  total: number
  /** Nombre de defis completes (status = 'completed') sur la fenetre */
  completed: number
}

export interface DifficultyDecision {
  difficulty: Difficulty
  xpMultiplier: number
  /** Taux de completion (entre 0 et 1) qui a guide la decision */
  completionRate: number
  /** True si on a manque de data (default = medium) */
  fallback: boolean
}

const HARD_THRESHOLD = 0.8
const MEDIUM_THRESHOLD = 0.4

/**
 * Determine la difficulte cible en fonction du taux de completion.
 * Si total === 0, on retourne 'medium' (decision par defaut).
 */
export function pickDifficulty(stats: UserChallengeStats): DifficultyDecision {
  if (!stats || stats.total <= 0) {
    return {
      difficulty: 'medium',
      xpMultiplier: 1,
      completionRate: 0,
      fallback: true,
    }
  }

  const completionRate = Math.max(0, Math.min(1, stats.completed / stats.total))

  if (completionRate > HARD_THRESHOLD) {
    return { difficulty: 'hard', xpMultiplier: 1.5, completionRate, fallback: false }
  }

  if (completionRate >= MEDIUM_THRESHOLD) {
    return { difficulty: 'medium', xpMultiplier: 1, completionRate, fallback: false }
  }

  return { difficulty: 'easy', xpMultiplier: 0.8, completionRate, fallback: false }
}

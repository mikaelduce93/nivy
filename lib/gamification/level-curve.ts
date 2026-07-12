/**
 * Courbe de niveaux UI — source unique (G2-A, décision PO 2026-07-11 :
 * « XP = progression pure, jamais dépensé »).
 *
 * C'est la courbe historiquement affichée aux ados (ex-`calculateLevelProgress`
 * de lib/server/teen-dashboard.ts) :
 *   - XP requis pour passer du niveau L au niveau L+1 : floor(100 · L · 1,5) = 150·L
 *   - XP total minimum pour ÊTRE niveau N : 75 · N · (N-1)
 *     (niveau 1 = 0 XP, niveau 2 = 150, niveau 3 = 450, niveau 4 = 900,
 *      niveau 5 = 1 500, niveau 7 = 3 150, niveau 9 = 5 400, …)
 *
 * ⚠️ La base (`add_xp_to_user`, user_xp.current_level) suit une AUTRE courbe
 * (N·(N+1)/2 · 100 — 000_base_tables.sql). Divergence pré-existante : les
 * surfaces teen affichent la courbe UI ci-dessous ; ne pas mélanger les deux.
 *
 * Module pur (aucun import serveur) — importable côté client ET serveur.
 */

export const MAX_LEVEL = 100

/** XP à gagner pour passer du niveau `level` au niveau `level + 1`. */
export function xpToLevelUp(level: number): number {
  return Math.floor(100 * level * 1.5)
}

/** XP total minimum pour être niveau `level` (niveau 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  // Somme des xpToLevelUp(1 … level-1) = 150 · (level-1) · level / 2.
  return 75 * level * (level - 1)
}

export interface LevelProgress {
  level: number
  xpToNextLevel: number
  xpInLevel: number
  progressPercent: number
}

/** Niveau + progression dans le niveau pour un XP total donné. */
export function levelProgressForXp(totalXp: number): LevelProgress {
  let level = 1
  let xpRequired = 0
  let xpForNext = xpToLevelUp(level)

  while (totalXp >= xpRequired + xpForNext && level < MAX_LEVEL) {
    xpRequired += xpForNext
    level += 1
    xpForNext = xpToLevelUp(level)
  }

  const xpInLevel = Math.max(0, totalXp - xpRequired)
  const progressPercent = xpForNext > 0 ? Math.round((xpInLevel / xpForNext) * 100) : 0

  return { level, xpToNextLevel: xpForNext, xpInLevel, progressPercent }
}

/**
 * Convertit un ancien « prix XP » en niveau de déblocage : le plus petit
 * niveau N dont le seuil d'XP total couvre le prix (arrondi au niveau
 * supérieur). Ex. 500 XP → niveau 4, 1 200 → 5, 2 500 → 7, 5 000 → 9.
 */
export function unlockLevelForXpCost(xpCost: number): number {
  if (xpCost <= 0) return 1
  let level = 1
  while (totalXpForLevel(level) < xpCost && level < MAX_LEVEL) {
    level += 1
  }
  return level
}

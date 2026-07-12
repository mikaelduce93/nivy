/**
 * Courbe de niveaux — SOURCE UNIQUE, alignée sur le backend (#348).
 *
 * Cette courbe DÉRIVE de la formule appliquée par `add_xp_to_user` /
 * `user_xp.current_level` (000_base_tables.sql:345) : on monte de niveau dès que
 *   total_xp >= (level · (level + 1) / 2) · 100
 * ce qui donne, pour ÊTRE niveau N :
 *   XP total minimum = ((N-1) · N / 2) · 100 = 50 · N · (N-1)
 *   (niveau 1 = 0 XP, niveau 2 = 100, niveau 3 = 300, niveau 4 = 600,
 *    niveau 5 = 1 000, niveau 6 = 1 500, …)
 * et pour passer du niveau L au niveau L+1 :
 *   XP à gagner = 100 · L
 *
 * ⚠️ Ne JAMAIS réintroduire une courbe UI distincte (ex-150·L / 75·N·(N-1)) :
 * le niveau affiché doit toujours égaler `user_xp.current_level` calculé en base.
 *
 * Module pur (aucun import serveur) — importable côté client ET serveur.
 */

export const MAX_LEVEL = 100

/** XP à gagner pour passer du niveau `level` au niveau `level + 1`. */
export function xpToLevelUp(level: number): number {
  return 100 * level
}

/** XP total minimum pour être niveau `level` (niveau 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  // Seuil backend pour ÊTRE niveau N : ((N-1)·N / 2) · 100 = 50 · N · (N-1).
  // Égal à la somme des xpToLevelUp(1 … level-1) = 100 · (level-1) · level / 2.
  return 50 * level * (level - 1)
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
 * supérieur). Ex. 500 XP → niveau 4, 1 200 → 6, 2 500 → 8, 5 000 → 11.
 */
export function unlockLevelForXpCost(xpCost: number): number {
  if (xpCost <= 0) return 1
  let level = 1
  while (totalXpForLevel(level) < xpCost && level < MAX_LEVEL) {
    level += 1
  }
  return level
}

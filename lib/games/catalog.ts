/**
 * Mini-jeux G4 — catalogue jouable v1 (SPEC-G4-BATTLES-MINIJEUX §7)
 * =================================================================
 *
 * Les 3 jeux construits par la vague G4-B3 : Quiz Rush (§7.1), Memory (§7.2),
 * Vrai/Faux Sprint (§7.3). Les autres slugs de `mini_game_types` (blindtest,
 * music_quiz, predictions, emoji_guess, daily_quiz) restent honnêtement
 * « bientôt » (§7.4 — jamais de CTA mort qui prétend se jouer).
 *
 * Les valeurs ci-dessous sont des DÉFAUTS d'affichage : si la ligne
 * `mini_game_types` du slug existe (mig 183 / J5), ses valeurs priment.
 * L'XP réellement crédité vient TOUJOURS du serveur (`complete_game_session`).
 */

export const PLAYABLE_GAME_SLUGS = ["quiz_rush", "memory", "vrai_faux"] as const

export type PlayableGameSlug = (typeof PLAYABLE_GAME_SLUGS)[number]

export function isPlayableSlug(slug: string): slug is PlayableGameSlug {
  return (PLAYABLE_GAME_SLUGS as readonly string[]).includes(slug)
}

/** Plafond anti-farm §6.2-5 : XP sur les 3 premières sessions par jeu et par jour. */
export const XP_SESSIONS_PER_DAY = 3

export interface PlayableGameDefaults {
  slug: PlayableGameSlug
  name: string
  description: string
  emoji: string
  /** XP max par session (barème serveur §6.1 — affichage seulement). */
  baseXp: number
  /** Nombre d'items (questions / affirmations / paires). */
  itemCount: number
  /** Chrono par item en secondes (0 = pas de chrono par item). */
  secondsPerItem: number
}

export const GAME_DEFAULTS: Record<PlayableGameSlug, PlayableGameDefaults> = {
  quiz_rush: {
    slug: "quiz_rush",
    name: "Quiz Rush",
    description: "10 questions de la banque, 10 secondes chacune. Vitesse et précision.",
    emoji: "⚡",
    baseXp: 20,
    itemCount: 10,
    secondsPerItem: 10,
  },
  memory: {
    slug: "memory",
    name: "Memory",
    description: "Retrouve les 8 paires en un minimum de coups.",
    emoji: "🧩",
    baseXp: 15,
    itemCount: 8,
    secondsPerItem: 0,
  },
  vrai_faux: {
    slug: "vrai_faux",
    name: "Vrai/Faux Sprint",
    description: "15 affirmations, 5 secondes pour trancher. Vrai ou faux ?",
    emoji: "🎯",
    baseXp: 15,
    itemCount: 15,
    secondsPerItem: 5,
  },
}

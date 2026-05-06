/**
 * NIVY - Voice & Tone constants
 * =============================
 *
 * Single source of truth for brand voice tokens. Reach for these
 * instead of hardcoding emojis or phrases — that way a future tone
 * tweak is a one-file edit.
 *
 * The companion guide is `docs/brand/VOICE_AND_TONE.md`.
 */

/** The official NIVY emoji palette. Use sparingly — one per message max. */
export const BRAND_EMOJI = {
  party: '🎉',
  fire: '🔥',
  gem: '💎',
  rocket: '🚀',
  sparkles: '✨',
  star: '🌟',
  heart: '💜',
  game: '🎮',
  trophy: '🏆',
  target: '🎯',
  panda: '🐼',
} as const

export type BrandEmoji = keyof typeof BRAND_EMOJI

/** Tone slots — pick the one that matches the moment, not just the screen. */
export type Tone = 'celebratory' | 'casual' | 'helpful' | 'urgent' | 'reassuring'

/**
 * Curated darija expressions vetted as brand-safe, teen-friendly and
 * legible across the Maghreb. Keep additions PG-13 — these surface to
 * 13-17 year olds and to their parents.
 */
export const DARIJA_LEXICON = {
  greetings: ['Wesh', 'Salam', 'Yo', 'Marhba'],
  affirmations: ['Saha', 'Wakha', 'Iyeh', 'Mzyan', 'Top'],
  energy: ['Yallah', 'Drebble', 'Sb3', 'Lhdar'],
  wow: ['Wa3r', 'Mzyan bzaf', 'Hoolah'],
  action: ['Sift', 'Dkhol', 'Khrej', 'Chouf'],
} as const

/** Lines we never ship. Audit gate uses this list. */
export const ANTI_PATTERNS: readonly string[] = [
  'Veuillez',
  'Une erreur est survenue',
  'Erreur lors de',
  'Erreur lors du',
  'Erreur lors de la',
  'Une erreur est',
  'Merci de patienter',
  'Cher utilisateur',
  'Vous devez',
] as const

/** Suggested replacements for common stale phrases. */
export const TONE_REPLACEMENTS: Record<string, string> = {
  'Une erreur est survenue': 'Oups, ca a pas marche. On retente? 💪',
  'Erreur lors de la mise a jour': 'Maj ratee. Retry?',
  'Veuillez patienter': 'Une seconde...',
  'Veuillez remplir tous les champs': 'Y a des cases vides — verifie',
  'Vous devez accepter les conditions': 'Faut accepter les conditions pour continuer',
}

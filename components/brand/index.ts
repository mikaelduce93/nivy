/**
 * NIVY - brand components public API
 * ==================================
 *
 * Single entry point for the panda mark and mascot. Import from
 * `@/components/brand` rather than the files directly so future
 * refactors stay painless.
 */

export { PandaLogo, PandaIcon } from './panda-logo'
export { PandaMascot, type MascotState } from './mascot-states'

// Niv — mascotte canonique + surfaces sombres (F2/F4)
export {
  Niv,
  DarkSurface,
  StatHero,
  type NivMood,
  type DarkTone,
  type NivProps,
  type DarkSurfaceProps,
  type StatHeroProps,
} from './niv'

// Wrappers d'usage de Niv (F4)
export {
  NivCoach,
  NivEmpty,
  NivCelebration,
  type NivCoachProps,
  type NivEmptyProps,
  type NivCelebrationProps,
} from './niv-usage'

// Tokens orbitants — signature hero (F3)
export { OrbitingTokens, type OrbitingTokensProps } from './orbiting-tokens'

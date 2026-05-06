/**
 * TEENS PARTY MOROCCO - Smart Challenge Assignment
 * ================================================
 *
 * Selection intelligente de templates de defis quotidiens:
 *  - Tirage cryptographique (jamais Math.random)
 *  - Anti-repetition: exclusion des templates deja utilises sur N derniers jours
 *  - Personnalisation: scoring base sur l'intersection des tags / interests
 *    avec les centres d'interet de l'utilisateur
 *
 * Utilise par `features/gamification/actions.ts` pour remplacer la
 * selection purement aleatoire (audit AUDIT_LEVEL_UP_ET_DEFIS Phase 2).
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface SelectableTemplate {
  id: string
  /** Tags optionnels (ex: ["football", "outdoor"]) */
  tags?: string[] | null
  /** Centres d'interet vises par le template (ex: ["Football", "K-Pop"]) */
  interests?: string[] | null
  /** Difficulte optionnelle */
  difficulty?: 'easy' | 'medium' | 'hard' | 'normal' | 'extreme' | string | null
  /** Tout autre champ est conserve, l'objet est retourne tel quel */
  [key: string]: unknown
}

export interface SelectChallengeOptions {
  /**
   * IDs de templates utilises recemment (ex: 7 derniers jours) que l'on
   * souhaite eviter. Si tous les templates sont filtres, on autorise la
   * repetition (pour ne jamais retourner null).
   */
  recentTemplateIds?: string[]
  /**
   * Centres d'interet de l'utilisateur (ex: ["Football", "K-Pop"]).
   * Sert a prioriser les templates dont `tags`/`interests` recoupent.
   */
  userInterests?: string[]
  /**
   * Difficulte cible (filtrage souple). Si fournie et qu'au moins un
   * template correspond, on restreint le tirage a ces templates.
   */
  targetDifficulty?: 'easy' | 'medium' | 'hard'
  /**
   * Taille du top considere apres scoring (3 par defaut).
   */
  topK?: number
}

export interface SelectChallengeResult<T extends SelectableTemplate> {
  template: T | null
  /** True si un boost lie aux interests utilisateur a ete applique */
  personalized: boolean
  /** True si on a du autoriser la repetition (filtres trop restrictifs) */
  fallbackRepetition: boolean
  /** True si la difficulte cible n'a pas pu etre satisfaite */
  fallbackDifficulty: boolean
}

/* ==========================================================================
   CRYPTO RNG
   ========================================================================== */

/**
 * Tirage d'un entier uniforme dans [0, max) en utilisant le RNG cryptographique
 * de la plateforme. Compatible Node (>=14.10), Edge runtime et navigateur.
 */
export function cryptoRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new RangeError('cryptoRandomInt: max must be a positive integer')
  }

  // Web Crypto (Edge / Browser / Node moderne)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    // Rejection sampling pour eviter le biais modulo.
    const range = 0x100000000 // 2^32
    const limit = range - (range % max)
    const buf = new Uint32Array(1)
    // Limite de boucles pour ne jamais bloquer (en pratique 1-2 iterations)
    for (let i = 0; i < 16; i++) {
      globalThis.crypto.getRandomValues(buf)
      if (buf[0] < limit) return buf[0] % max
    }
    return buf[0] % max
  }

  // Fallback Node (sandbox sans web crypto). Charge de facon dynamique pour
  // ne jamais casser le bundle Edge.
  try {

    const nodeCrypto = require('node:crypto') as typeof import('node:crypto')
    if (typeof nodeCrypto.randomInt === 'function') {
      return nodeCrypto.randomInt(0, max)
    }
    const buf = nodeCrypto.randomBytes(4)
    return buf.readUInt32BE(0) % max
  } catch {
    throw new Error('cryptoRandomInt: no secure RNG available in this runtime')
  }
}

/* ==========================================================================
   SCORING
   ========================================================================== */

function intersectionCount(a: string[] | null | undefined, b: string[] | null | undefined): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0
  const setB = new Set(b.map((s) => s.toLowerCase().trim()))
  let n = 0
  for (const item of a) {
    if (setB.has(item.toLowerCase().trim())) n++
  }
  return n
}

function scoreTemplate(template: SelectableTemplate, userInterests: string[]): number {
  const tagsScore = intersectionCount(template.tags ?? [], userInterests)
  const interestsScore = intersectionCount(template.interests ?? [], userInterests)
  return tagsScore + interestsScore
}

/* ==========================================================================
   PUBLIC API
   ========================================================================== */

/**
 * Selectionne UN template parmi `templates` selon les options fournies.
 *
 * Pipeline:
 *  1. Filtrage anti-repetition (recentTemplateIds). Si plus rien -> on
 *     restaure tout l'ensemble (fallbackRepetition = true).
 *  2. Filtrage difficulte (targetDifficulty). Si plus rien -> on garde
 *     l'etape precedente (fallbackDifficulty = true).
 *  3. Scoring par intersection des interests utilisateur. On garde le top
 *     `topK` (3 par defaut). Si tous les scores sont 0, le top contient
 *     tous les templates (selection uniforme, personalized = false).
 *  4. Tirage crypto uniforme dans le top.
 */
export function selectChallengeTemplate<T extends SelectableTemplate>(
  templates: T[],
  options: SelectChallengeOptions = {},
): SelectChallengeResult<T> {
  if (!templates || templates.length === 0) {
    return {
      template: null,
      personalized: false,
      fallbackRepetition: false,
      fallbackDifficulty: false,
    }
  }

  const { recentTemplateIds, userInterests, targetDifficulty, topK = 3 } = options

  // Etape 1: anti-repetition
  let pool = templates
  let fallbackRepetition = false
  if (recentTemplateIds && recentTemplateIds.length > 0) {
    const recent = new Set(recentTemplateIds)
    const filtered = templates.filter((t) => !recent.has(t.id))
    if (filtered.length === 0) {
      fallbackRepetition = true
    } else {
      pool = filtered
    }
  }

  // Etape 2: difficulte
  let fallbackDifficulty = false
  if (targetDifficulty) {
    const diffPool = pool.filter((t) => {
      if (!t.difficulty) return false
      const d = String(t.difficulty).toLowerCase()
      if (targetDifficulty === 'medium') return d === 'medium' || d === 'normal'
      return d === targetDifficulty
    })
    if (diffPool.length === 0) {
      fallbackDifficulty = true
    } else {
      pool = diffPool
    }
  }

  // Etape 3: scoring
  let personalized = false
  let candidates: T[] = pool
  if (userInterests && userInterests.length > 0) {
    const scored = pool
      .map((t) => ({ t, score: scoreTemplate(t, userInterests) }))
      .sort((a, b) => b.score - a.score)
    const maxScore = scored[0]?.score ?? 0
    if (maxScore > 0) {
      personalized = true
      // Garde le top K (au moins ceux qui ont au moins 1 d'intersection,
      // sinon on completera avec des templates a score 0 pour atteindre topK).
      const positives = scored.filter((s) => s.score > 0).map((s) => s.t)
      if (positives.length >= topK) {
        candidates = positives.slice(0, topK)
      } else {
        const rest = scored.filter((s) => s.score === 0).map((s) => s.t)
        candidates = [...positives, ...rest].slice(0, Math.max(topK, positives.length))
      }
    } else {
      candidates = pool
    }
  }

  // Etape 4: tirage crypto
  const idx = cryptoRandomInt(candidates.length)
  return {
    template: candidates[idx] ?? null,
    personalized,
    fallbackRepetition,
    fallbackDifficulty,
  }
}

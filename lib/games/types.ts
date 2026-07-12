/**
 * Mini-jeux G4 — contrat API client ↔ routes (SPEC-G4 §7.1)
 * =========================================================
 *
 * Types partagés entre les clients de jeu (`app/teen/games/[slug]/*`) et les
 * routes (`app/api/teen/games/**`). Les routes NORMALISENT le retour des RPC
 * serveur (mig 181/182 : `create_game_session_v2`, `submit_game_answer`,
 * `complete_game_session`) vers ces formes — le client ne voit jamais le
 * payload brut, et JAMAIS les champs `correct`/`explanation` avant soumission.
 */

/** Question strippée (Quiz Rush) — sans `correct` ni `explanation`. */
export interface StrippedQuestion {
  question: string
  options: string[]
}

/** Affirmation (Vrai/Faux Sprint) — la vérité reste côté serveur. */
export interface StrippedStatement {
  question: string
  /** Réponse proposée à juger vraie/fausse (vide si l'énoncé est autoporteur). */
  proposition: string
}

export interface SessionXpInfo {
  /** Sessions déjà créditées en XP aujourd'hui pour CE jeu (jour Casablanca). */
  creditedToday: number
  /** Plafond §6.2-5 (3 sessions créditées / jeu / jour). */
  capPerDay: number
  /** true = plafond atteint : la partie se joue en mode entraînement (0 XP). */
  training: boolean
}

export type StartSessionResponse =
  | {
      ok: true
      sessionId: string
      slug: string
      /** Quiz Rush : questions strippées. */
      questions?: StrippedQuestion[]
      /** Vrai/Faux : affirmations. */
      statements?: StrippedStatement[]
      /** Memory : 16 identifiants de paire (0..7) dans l'ordre du plateau. */
      layout?: number[]
      /** Memory : id du set d'emojis (lib/games/memory-sets.ts). */
      setId?: string
      xp: SessionXpInfo
    }
  | {
      ok: false
      /**
       * `unavailable` = infra absente (migrations 181/182 pas encore
       * appliquées, ou slug inconnu du catalogue) → l'UI affiche « bientôt ».
       * `cooldown` = `mini_game_types.cooldown_minutes` pas écoulé.
       */
      reason: "unavailable" | "cooldown" | "error"
      retryMinutes?: number
      message?: string
    }

export interface AnswerVerdict {
  ok: boolean
  /** null si la RPC n'a pas renvoyé de verdict lisible (on avance sans feedback). */
  correct: boolean | null
  /** Index de la bonne réponse, révélé APRÈS soumission seulement (si fourni). */
  correctIndex: number | null
}

export interface CompleteResult {
  ok: boolean
  /** Score serveur, dérivé exclusivement de `game_sessions.answers` (§7.1). */
  score: number | null
  /** XP réellement crédité par le serveur (0 = entraînement / plafond). */
  xpAwarded: number
  xp: SessionXpInfo
}

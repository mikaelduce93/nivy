/**
 * G4-B2 — Battles 1v1 synchrones : types partagés + constantes client/serveur.
 *
 * Contrat = docs/specs/SPEC-G4-BATTLES-MINIJEUX.md (§3.1 DDL, §3.2 événements,
 * §3.3 cycle de vie). Le socle DB (mig 181/182) est livré par un agent
 * parallèle : tout ce fichier code CONTRE ce contrat, et les helpers
 * `isMissingSchemaError` permettent de dégrader proprement (« Les battles
 * arrivent bientôt », pattern tryAdaptiveQuizRecommendations de
 * lib/quiz/server.ts) tant que les migrations ne sont pas appliquées.
 *
 * Aucune logique de correction ici : la bonne réponse ne quitte jamais le
 * serveur (spec §3.0/§3.4-1) — le client n'affiche que `current_payload`
 * déjà strippé.
 */

export type BattleStatus =
  | "invited"
  | "lobby"
  | "active"
  | "resolved"
  | "cancelled"
  | "expired"

export type BattleResolution = "score" | "forfeit" | "expired" | null

/** Question du round courant, strippée serveur (jamais de `correct`/`explanation`). */
export interface BattleRoundPayload {
  question?: string
  options?: string[]
  [key: string]: unknown
}

/** Ligne `battles` (spec §3.1). */
export interface BattleRow {
  id: string
  kind: string
  status: BattleStatus
  creator_id: string
  opponent_id: string
  quiz_id: string | null
  rounds_total: number
  current_round: number
  round_deadline: string | null
  current_payload: BattleRoundPayload | null
  winner_id: string | null
  is_draw: boolean
  resolution: BattleResolution
  created_at: string
  accepted_at: string | null
  started_at: string | null
  resolved_at: string | null
  expires_at: string | null
}

/** Ligne `battle_participants` (spec §3.1 — score/correct_count publiés à la clôture du round SEULEMENT). */
export interface BattleParticipantRow {
  battle_id: string
  teen_id: string
  creator_id: string
  opponent_id: string
  score: number
  correct_count: number
  answered_current: boolean
  round_seen_at: string | null
  is_ready: boolean
  last_seen_at: string | null
  reactions_count: number
  xp_awarded: number
}

/** Identité affichable d'un joueur (pattern mig 148 / resolveTeenIdentities). */
export interface BattlePlayer {
  id: string
  pseudo: string
  avatar_url: string | null
  level: number
}

/** Item allégé pour la page liste /teen/battles. */
export interface BattleListItem {
  id: string
  status: BattleStatus
  resolution: BattleResolution
  is_draw: boolean
  winner_id: string | null
  current_round: number
  rounds_total: number
  created_at: string
  expires_at: string | null
  iAmCreator: boolean
  /** L'AUTRE joueur, vu du teen courant. */
  other: BattlePlayer
}

/** Set fermé de 6 emojis (spec §5.1-3) — défini en code, jamais de texte libre. */
export const BATTLE_REACTION_EMOJIS = ["👏", "😮", "😂", "🔥", "💪", "🤝"] as const
export type BattleReactionEmoji = (typeof BATTLE_REACTION_EMOJIS)[number]

/** Défauts PO : 5 rounds × 15 s (spec §9 P6). */
export const BATTLE_ROUND_SECONDS = 15
/** Rate-limit réactions côté UI (miroir du serveur, spec §5.1-3). */
export const REACTIONS_MAX_PER_ROUND = 3
export const REACTIONS_MAX_PER_BATTLE = 10

/**
 * Vrai si l'erreur Supabase signifie « le schéma battles n'est pas encore
 * en base » (RPC ou table absente — migration 181/182 pas appliquée).
 * Codes : PGRST202/42883 = fonction inconnue, PGRST205/42P01 = table inconnue.
 * Même détection que tryAdaptiveQuizRecommendations (lib/quiz/server.ts).
 */
export function isMissingSchemaError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false
  const code = error.code ?? ""
  if (["PGRST202", "PGRST205", "42883", "42P01"].includes(code)) return true
  return /does not exist|schema cache|could not find/i.test(error.message ?? "")
}

/**
 * Erreur MÉTIER d'une RPC battles (mig 182) : les 12 RPC renvoient leurs
 * refus en jsonb `{success:false, error:'code'}` SANS lever d'erreur
 * PostgREST — le champ `error` du retour supabase.rpc() est donc toujours
 * null pour ces cas. À appeler sur `data` après CHAQUE rpc battles :
 * renvoie le code d'erreur métier, ou null si succès.
 */
export function battleRpcFailure(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const d = data as { success?: unknown; error?: unknown }
  if (d.success !== false) return null
  return typeof d.error === "string" && d.error ? d.error : "unknown_error"
}

/**
 * Traduction FR bienveillante des erreurs des RPC battles (gardes §3.3/§4 M9).
 * Accepte indifféremment un code métier (`{success:false, error:'code'}`,
 * mig 182 — via battleRpcFailure) ou un message PostgREST ; les codes exacts
 * sont mappés d'abord, puis retombée sur des familles regex, puis générique.
 */
export function battleErrorMessage(message: string | null | undefined): string {
  const m = message ?? ""
  if (m.includes("battle_identity_unsupported"))
    return "Ton compte ne prend pas encore en charge les battles."
  if (m.includes("not_authenticated")) return "Reconnecte-toi pour continuer."
  if (m.includes("battle_not_found")) return "Cette battle n'existe plus."
  if (m.includes("opponent_still_present"))
    return "Ton adversaire est toujours là — la battle continue !"
  if (m.includes("participants_not_ready"))
    return "Vous devez être prêts tous les deux pour lancer la battle."
  if (/no_active_quiz|quiz_not_available|question_unavailable/.test(m))
    return "Aucun quiz disponible pour cette battle — réessaie plus tard."
  if (/wrong_round|round_not_found/.test(m))
    return "Ce round est déjà clos — le suivant arrive."
  if (m.includes("invalid_status"))
    return "Cette battle n'en est plus là — elle va se resynchroniser."
  if (/invalid_opponent|unauthorized_caller/.test(m))
    return "Tu ne peux pas faire ça sur cette battle."
  if (/not_friends|friend/i.test(m)) return "Vous devez être amis pour vous défier."
  if (/block/i.test(m)) return "Tu ne peux pas défier ce joueur."
  if (/decline|cooldown/i.test(m))
    return "Ce joueur a refusé récemment — laisse-lui un peu de temps."
  if (/pending|unresolved|already/i.test(m))
    return "Vous avez déjà une battle en cours ensemble."
  if (/pair|daily|quota|limit|cap/i.test(m))
    return "Limite de battles atteinte pour aujourd'hui — réessaie demain."
  if (/expired|ttl/i.test(m)) return "Cette invitation a expiré."
  if (/deadline|late|too_late/i.test(m)) return "Trop tard pour ce round !"
  return "Action impossible pour le moment. Réessaie."
}

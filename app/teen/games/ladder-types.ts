/**
 * Types du classement hebdo amis/crew de /teen/games (SPEC-G4 §6.4, §8 J7).
 *
 * Fichier SANS "server-only" : partagé entre l'assembleur serveur
 * (ladder-data.ts) et le client d'affichage (games-client.tsx).
 */

export interface LadderRow {
  id: string
  pseudo: string
  level: number
  /** Battles gagnées cette semaine (battles.winner_id, status='resolved'). */
  wins: number
  /** Points mini-jeux de la semaine (somme des game_sessions.score complétées). */
  points: number
  isMe: boolean
}

export interface CrewLadderInfo {
  hasCrew: boolean
  name: string | null
  /** Compteur crews.total_challenges_won (mig 007, incrémenté par la mig 182 §6.4). */
  totalChallengesWon: number
  rows: LadderRow[]
}

export interface WeeklyLadder {
  /** Début de semaine (lundi 00:00 Africa/Casablanca) en ISO UTC. */
  weekStartIso: string
  /** true = le teen a au moins un ami accepted (sinon empty state). */
  hasFriends: boolean
  /** Le teen + ses amis `accepted`, triés victoires puis points. */
  friends: LadderRow[]
  crew: CrewLadderInfo
}

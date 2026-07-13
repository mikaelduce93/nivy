/**
 * TEENS PARTY MOROCCO - Mini Games Actions
 * =========================================
 *
 * Server actions pour les mini-jeux.
 */
// drift-allow: getUserGameStats lit game_sessions/battles livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import { resolveTeenIdentities } from "@/lib/server/teen-identities"
import {
  type MiniGameType,
  type GameSession,
  type GameSessionWithDetails,
  type GameParticipant,
  type MusicQuizQuestion,
  type MemoryCard,
  type PredictionQuestion,
  type PredictionQuestionWithUserPrediction,
  type UserPrediction,
  type LeaderboardEntry,
} from "./schema"

/* ==========================================================================
   TYPES DE JEUX
   ========================================================================== */

/**
 * Récupère tous les types de mini-jeux
 */
export async function getMiniGameTypes(): Promise<{
  success: boolean
  data?: MiniGameType[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("mini_game_types")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) throw error

    // Frontier cast : la row live a des colonnes nullable / slug string là où le
    // domaine MiniGameType les veut non-null (drift schéma vs zod local).
    return { success: true, data: data as MiniGameType[] }
  } catch (error) {
    logDbError("mini-games.getMiniGameTypes", error)
    return { success: false, error: "Impossible de charger les types de jeux" }
  }
}

/**
 * Récupère un type de jeu par slug
 */
export async function getGameTypeBySlug(slug: string): Promise<{
  success: boolean
  data?: MiniGameType
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("mini_game_types")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single()

    if (error) throw error

    return { success: true, data: data as MiniGameType }
  } catch (error) {
    logDbError("mini-games.getGameTypeBySlug", error)
    return { success: false, error: "Type de jeu non trouvé" }
  }
}

/* ==========================================================================
   SESSIONS DE JEU
   ========================================================================== */

/**
 * Crée une nouvelle session de jeu
 */
export async function createGameSession(
  gameTypeSlug: string,
  settings: Record<string, any> = {}
): Promise<{
  success: boolean
  data?: {
    session_id: string
    game_type: MiniGameType
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("create_game_session", {
      p_user_id: user.id,
      p_game_type_slug: gameTypeSlug,
      p_settings: settings,
    })

    if (error) throw error

    // RPC typée Json en live : cast de frontière vers le contrat métier.
    const result = data as {
      success: boolean
      error?: string
      session_id: string
      game_type: MiniGameType
    }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return {
      success: true,
      data: {
        session_id: result.session_id,
        game_type: result.game_type,
      },
    }
  } catch (error) {
    logDbError("mini-games.createGameSession", error)
    return { success: false, error: "Erreur lors de la création de la session" }
  }
}

/**
 * Rejoint une session de jeu
 */
export async function joinGameSession(sessionId: string): Promise<{
  success: boolean
  data?: {
    session_id: string
    participant_count: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("join_game_session", {
      p_user_id: user.id,
      p_session_id: sessionId,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      session_id: string
      participant_count: number
    }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return {
      success: true,
      data: { session_id: result.session_id, participant_count: result.participant_count },
    }
  } catch (error) {
    logDbError("mini-games.joinGameSession", error)
    return { success: false, error: "Erreur lors de la connexion à la session" }
  }
}

/**
 * Démarre une session de jeu
 */
export async function startGameSession(
  sessionId: string,
  gameData: Record<string, any> = {}
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("start_game_session", {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_game_data: gameData,
    })

    if (error) throw error

    const result = data as { success: boolean; error?: string }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    logDbError("mini-games.startGameSession", error)
    return { success: false, error: "Erreur lors du démarrage" }
  }
}

/**
 * Soumet un score
 */
export async function submitGameScore(
  sessionId: string,
  score: number,
  gameState: Record<string, any> = {}
): Promise<{
  success: boolean
  data?: {
    score: number
    xp_earned: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("submit_game_score", {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_score: score,
      p_game_state: gameState,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      score: number
      xp_earned: number
    }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath("/games")
    revalidatePath("/profile")

    return {
      success: true,
      data: {
        score: result.score,
        xp_earned: result.xp_earned,
      },
    }
  } catch (error) {
    logDbError("mini-games.submitGameScore", error)
    return { success: false, error: "Erreur lors de la soumission du score" }
  }
}

/**
 * Termine une session et calcule les résultats
 */
export async function endGameSession(sessionId: string): Promise<{
  success: boolean
  data?: {
    winner_id: string
    winner_score: number
    results: GameParticipant[]
  }
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("end_game_session", {
      p_session_id: sessionId,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      winner_id: string
      winner_score: number
      results: GameParticipant[]
    }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath("/games")

    return {
      success: true,
      data: {
        winner_id: result.winner_id,
        winner_score: result.winner_score,
        results: result.results,
      },
    }
  } catch (error) {
    logDbError("mini-games.endGameSession", error)
    return { success: false, error: "Erreur lors de la fin de partie" }
  }
}

/**
 * Récupère une session avec ses détails
 */
export async function getGameSession(sessionId: string): Promise<{
  success: boolean
  data?: GameSessionWithDetails
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: session, error: sessionError } = await supabase
      .from("mini_game_sessions")
      .select(
        `
        *,
        game_type:game_type_id(*)
      `
      )
      .eq("id", sessionId)
      .single()

    if (sessionError) throw sessionError

    const { data: participants, error: participantsError } = await supabase
      .from("mini_game_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("score", { ascending: false })

    if (participantsError) throw participantsError

    // Ni host_user_id (mini_game_sessions) ni user_id (mini_game_participants) n'ont
    // de FK PostgREST vers une table portant pseudo/avatar_url : les embeds
    // `host:host_user_id(...)` / `user:user_id(...)` échouaient au runtime
    // (« could not find the relation »). On résout applicativement.
    const rows = participants ?? []
    const identities = await resolveTeenIdentities(supabase, [
      session.host_user_id,
      ...rows.map((p) => p.user_id),
    ])

    return {
      success: true,
      data: {
        ...session,
        host: session.host_user_id
          ? {
              pseudo: identities.get(session.host_user_id)?.pseudo ?? "",
              avatar_url: identities.get(session.host_user_id)?.avatar_url ?? undefined,
            }
          : undefined,
        participants: rows.map((p) => ({
          ...p,
          pseudo: p.user_id ? identities.get(p.user_id)?.pseudo ?? undefined : undefined,
          avatar_url: p.user_id
            ? identities.get(p.user_id)?.avatar_url ?? undefined
            : undefined,
        })),
      } as GameSessionWithDetails,
    }
  } catch (error) {
    logDbError("mini-games.getGameSession", error)
    return { success: false, error: "Session non trouvée" }
  }
}

/* ==========================================================================
   QUIZ MUSICAL
   ========================================================================== */

/**
 * Récupère des questions de quiz aléatoires
 */
export async function getRandomQuizQuestions(
  count: number = 5,
  difficulty?: string,
  genre?: string
): Promise<{
  success: boolean
  data?: MusicQuizQuestion[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_random_quiz_questions", {
      p_count: count,
      p_difficulty: difficulty || undefined,
      p_genre: genre || undefined,
    })

    if (error) throw error

    return { success: true, data: data as unknown as MusicQuizQuestion[] }
  } catch (error) {
    logDbError("mini-games.getRandomQuizQuestions", error)
    return { success: false, error: "Erreur lors du chargement des questions" }
  }
}

/**
 * Vérifie une réponse de quiz
 */
export async function checkQuizAnswer(
  questionId: string,
  answerIndex: number
): Promise<{
  success: boolean
  data?: {
    is_correct: boolean
    correct_answer: string
    points: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: question, error } = await supabase
      .from("music_quiz_questions")
      .select("correct_answer, options, points")
      .eq("id", questionId)
      .single()

    if (error) throw error

    // options est stocké en jsonb → cast de frontière vers string[].
    const selectedAnswer = (question.options as string[] | null)?.[answerIndex]
    const isCorrect = selectedAnswer === question.correct_answer

    return {
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: question.correct_answer,
        points: isCorrect ? question.points ?? 0 : 0,
      },
    }
  } catch (error) {
    logDbError("mini-games.checkQuizAnswer", error)
    return { success: false, error: "Erreur lors de la vérification" }
  }
}

/* ==========================================================================
   MEMORY GAME
   ========================================================================== */

/**
 * Récupère les cartes pour un jeu Memory
 */
export async function getMemoryCards(
  cardSet: string = "artists",
  difficulty: string = "medium"
): Promise<{
  success: boolean
  data?: MemoryCard[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("memory_game_cards")
      .select("*")
      .eq("card_set", cardSet)
      .eq("difficulty", difficulty)
      .eq("is_active", true)

    if (error) throw error

    return { success: true, data: data as MemoryCard[] }
  } catch (error) {
    logDbError("mini-games.getMemoryCards", error)
    return { success: false, error: "Erreur lors du chargement des cartes" }
  }
}

/* ==========================================================================
   PRÉDICTIONS
   ========================================================================== */

/**
 * Récupère les questions de prédiction ouvertes
 */
export async function getOpenPredictions(eventId?: string): Promise<{
  success: boolean
  data?: PredictionQuestionWithUserPrediction[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let query = supabase
      .from("prediction_questions")
      .select("*")
      .eq("status", "open")
      .eq("is_active", true)

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data: questions, error } = await query.order("created_at", {
      ascending: false,
    })

    if (error) throw error

    // Récupérer les prédictions de l'utilisateur
    let userPredictions: Record<string, UserPrediction> = {}
    if (user) {
      const { data: predictions } = await supabase
        .from("user_predictions")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "prediction_question_id",
          questions.map((q) => q.id)
        )

      if (predictions) {
        userPredictions = (predictions as unknown as UserPrediction[]).reduce(
          (acc, p) => {
            acc[p.prediction_question_id] = p
            return acc
          },
          {} as Record<string, UserPrediction>
        )
      }
    }

    const enrichedQuestions = questions.map((q) => ({
      ...q,
      user_prediction: userPredictions[q.id],
    }))

    return {
      success: true,
      data: enrichedQuestions as unknown as PredictionQuestionWithUserPrediction[],
    }
  } catch (error) {
    logDbError("mini-games.getOpenPredictions", error)
    return { success: false, error: "Erreur lors du chargement des prédictions" }
  }
}

/**
 * Fait une prédiction
 */
export async function makePrediction(
  questionId: string,
  optionIndex: number,
  confidence: number = 50
): Promise<{
  success: boolean
  data?: {
    bonus_earned: boolean
    prediction_rank: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("make_prediction", {
      p_user_id: user.id,
      p_question_id: questionId,
      p_option_index: optionIndex,
      p_confidence: confidence,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      bonus_earned: boolean
      prediction_rank: number
    }

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath("/games/predictions")

    return {
      success: true,
      data: {
        bonus_earned: result.bonus_earned,
        prediction_rank: result.prediction_rank,
      },
    }
  } catch (error) {
    logDbError("mini-games.makePrediction", error)
    return { success: false, error: "Erreur lors de la prédiction" }
  }
}

/**
 * Récupère les résultats des prédictions de l'utilisateur
 */
export async function getUserPredictionResults(): Promise<{
  success: boolean
  data?: Array<UserPrediction & { question: PredictionQuestion }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("user_predictions")
      .select(
        `
        *,
        question:prediction_question_id(*)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data as unknown as Array<UserPrediction & { question: PredictionQuestion }>,
    }
  } catch (error) {
    logDbError("mini-games.getUserPredictionResults", error)
    return { success: false, error: "Erreur lors du chargement des résultats" }
  }
}

/* ==========================================================================
   LEADERBOARDS
   ========================================================================== */

/**
 * Récupère le leaderboard d'un jeu
 */
export async function getGameLeaderboard(
  gameTypeSlug: string,
  period: "daily" | "weekly" | "all_time" = "weekly",
  limit: number = 20
): Promise<{
  success: boolean
  data?: LeaderboardEntry[]
  userRank?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc("get_game_leaderboard", {
      p_game_type_slug: gameTypeSlug,
      p_period: period,
      p_limit: limit,
    })

    if (error) throw error

    // RPC typée Json en live : cast de frontière vers le contrat leaderboard.
    const entries = (data ?? []) as unknown as LeaderboardEntry[]

    // Trouver le rang de l'utilisateur
    let userRank: number | undefined
    if (user) {
      const userEntry = entries.find((entry) => entry.user_id === user.id)
      userRank = userEntry?.rank
    }

    return { success: true, data: entries, userRank }
  } catch (error) {
    logDbError("mini-games.getGameLeaderboard", error)
    return { success: false, error: "Erreur lors du chargement du classement" }
  }
}

/**
 * Récupère les scores quotidiens de l'utilisateur
 */
export async function getUserDailyScores(
  gameTypeSlug?: string
): Promise<{
  success: boolean
  data?: Array<{
    game_type: MiniGameType
    best_score: number
    games_played: number
    total_xp_earned: number
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    let query = supabase
      .from("daily_game_scores")
      .select(
        `
        *,
        game_type:game_type_id(*)
      `
      )
      .eq("user_id", user.id)
      .eq("score_date", new Date().toISOString().split("T")[0])

    if (gameTypeSlug) {
      const { data: gameType } = await supabase
        .from("mini_game_types")
        .select("id")
        .eq("slug", gameTypeSlug)
        .single()

      if (gameType) {
        query = query.eq("game_type_id", gameType.id)
      }
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data as unknown as Array<{
        game_type: MiniGameType
        best_score: number
        games_played: number
        total_xp_earned: number
      }>,
    }
  } catch (error) {
    logDbError("mini-games.getUserDailyScores", error)
    return { success: false, error: "Erreur lors du chargement des scores" }
  }
}

/**
 * Table/RPC absente : migrations G4 (181/182) pas encore appliquées —
 * même détection que lib/battles/types.isMissingSchemaError.
 */
function isMissingGameSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code ?? "")) return true
  return /does not exist|schema cache|could not find/i.test(error.message ?? "")
}

/**
 * Récupère les stats globales de jeu de l'utilisateur.
 *
 * G4 (spec SPEC-G4-BATTLES-MINIJEUX §8 J5) : la source réelle est
 * `game_sessions` (mig 181, RLS self-only) — plus `weekly_game_leaderboard`
 * (moteur legacy mig 011 abandonné, jamais alimenté par les jeux G4).
 * Les victoires viennent des battles gagnées (`battles.winner_id`, RLS
 * participant). Tables absentes (mig 181 pas appliquée) → zéros honnêtes.
 */
export async function getUserGameStats(): Promise<{
  success: boolean
  data?: {
    total_games_played: number
    total_xp_earned: number
    win_count: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Sessions mini-jeux complétées (self-only par RLS — filtre explicite
    // pour l'index idx_game_sessions_teen_day).
    const { data: sessions, error: sessionsError } = await supabase
      .from("game_sessions")
      .select("xp_awarded")
      .eq("teen_id", user.id)
      .eq("status", "completed")

    if (sessionsError && !isMissingGameSchema(sessionsError)) throw sessionsError

    // Battles gagnées (RLS participant : je ne vois que mes battles).
    const { count: winCount, error: winsError } = await supabase
      .from("battles")
      .select("id", { count: "exact", head: true })
      .eq("winner_id", user.id)
      .eq("status", "resolved")

    if (winsError && !isMissingGameSchema(winsError)) throw winsError

    const sessionRows = ((sessions ?? []) as unknown as { xp_awarded: number | null }[])

    return {
      success: true,
      data: {
        total_games_played: sessionRows.length,
        total_xp_earned: sessionRows.reduce((sum, s) => sum + (s.xp_awarded ?? 0), 0),
        win_count: winCount ?? 0,
      },
    }
  } catch (error) {
    logDbError("mini-games.getUserGameStats", error)
    return { success: false, error: "Erreur lors du chargement des stats" }
  }
}

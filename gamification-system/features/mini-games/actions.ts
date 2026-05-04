/**
 * TEENS PARTY MOROCCO - Mini Games Actions
 * =========================================
 *
 * Server actions pour les mini-jeux.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
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

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching game types:", error)
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

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching game type:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      data: {
        session_id: data.session_id,
        game_type: data.game_type,
      },
    }
  } catch (error) {
    console.error("Error creating game session:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error joining game session:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error starting game session:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    revalidatePath("/games")
    revalidatePath("/profile")

    return {
      success: true,
      data: {
        score: data.score,
        xp_earned: data.xp_earned,
      },
    }
  } catch (error) {
    console.error("Error submitting score:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    revalidatePath("/games")

    return {
      success: true,
      data: {
        winner_id: data.winner_id,
        winner_score: data.winner_score,
        results: data.results,
      },
    }
  } catch (error) {
    console.error("Error ending game session:", error)
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
        game_type:game_type_id(*),
        host:host_user_id(pseudo, avatar_url)
      `
      )
      .eq("id", sessionId)
      .single()

    if (sessionError) throw sessionError

    const { data: participants, error: participantsError } = await supabase
      .from("mini_game_participants")
      .select(
        `
        *,
        user:user_id(pseudo, avatar_url)
      `
      )
      .eq("session_id", sessionId)
      .order("score", { ascending: false })

    if (participantsError) throw participantsError

    return {
      success: true,
      data: {
        ...session,
        participants: participants.map((p) => ({
          ...p,
          pseudo: p.user?.pseudo,
          avatar_url: p.user?.avatar_url,
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching game session:", error)
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
      p_difficulty: difficulty || null,
      p_genre: genre || null,
    })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching quiz questions:", error)
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

    const selectedAnswer = question.options?.[answerIndex]
    const isCorrect = selectedAnswer === question.correct_answer

    // Mettre à jour les stats
    await supabase.rpc("increment", {
      table_name: "music_quiz_questions",
      row_id: questionId,
      column_name: "play_count",
      amount: 1,
    })

    return {
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: question.correct_answer,
        points: isCorrect ? question.points : 0,
      },
    }
  } catch (error) {
    console.error("Error checking answer:", error)
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

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching memory cards:", error)
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
        userPredictions = predictions.reduce(
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

    return { success: true, data: enrichedQuestions }
  } catch (error) {
    console.error("Error fetching predictions:", error)
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

    if (!data.success) {
      return { success: false, error: data.error }
    }

    revalidatePath("/games/predictions")

    return {
      success: true,
      data: {
        bonus_earned: data.bonus_earned,
        prediction_rank: data.prediction_rank,
      },
    }
  } catch (error) {
    console.error("Error making prediction:", error)
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

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching prediction results:", error)
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

    // Trouver le rang de l'utilisateur
    let userRank: number | undefined
    if (user && data) {
      const userEntry = data.find((entry: any) => entry.user_id === user.id)
      userRank = userEntry?.rank
    }

    return { success: true, data, userRank }
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
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

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching daily scores:", error)
    return { success: false, error: "Erreur lors du chargement des scores" }
  }
}

/**
 * Récupère les stats globales de jeu de l'utilisateur
 */
export async function getUserGameStats(): Promise<{
  success: boolean
  data?: {
    total_games_played: number
    total_xp_earned: number
    favorite_game?: string
    best_rank?: number
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

    // Stats globales
    const { data: weeklyStats, error } = await supabase
      .from("weekly_game_leaderboard")
      .select(
        `
        *,
        game_type:game_type_id(slug, name)
      `
      )
      .eq("user_id", user.id)

    if (error) throw error

    const stats = {
      total_games_played: weeklyStats.reduce((sum, s) => sum + s.games_played, 0),
      total_xp_earned: weeklyStats.reduce((sum, s) => sum + s.total_score, 0) / 10,
      favorite_game: weeklyStats.sort((a, b) => b.games_played - a.games_played)[0]
        ?.game_type?.name,
      best_rank: weeklyStats.reduce(
        (best, s) => (s.rank && (!best || s.rank < best) ? s.rank : best),
        undefined as number | undefined
      ),
      win_count: weeklyStats.reduce((sum, s) => sum + s.win_count, 0),
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error("Error fetching game stats:", error)
    return { success: false, error: "Erreur lors du chargement des stats" }
  }
}

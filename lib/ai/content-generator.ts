/**
 * Content Generator Service
 * Génère automatiquement du contenu (quiz, quêtes, défis) basé sur le profil utilisateur
 * Supporte OpenAI et Anthropic Claude via Strategy Pattern
 */

import { createClient } from "@/lib/supabase/server"
import { ContentValidator } from "./content-validator"
import { EnhancedQuizPrompts, type TeenContext } from "./enhanced-quiz-prompts"
import { InterestIntegration } from "./interest-integration"
import { FactualValidator } from "./factual-validator"
import { AIProviderFactory, type AIProviderType } from "./providers/factory"
import {
  supportsStructured,
  type AIProviderMetadata,
  type BaseAIProvider,
  type StructuredSchema,
} from "./providers/base"
import { checkContentSafety, logSafetyOutcome } from "./content-safety"

export type ContentType = "quiz" | "mission" | "challenge" | "daily_challenge" | "quest"
export { type AIProviderType as AIProvider }

/**
 * Default model IDs for each provider — current as of 2026-Q2.
 *
 * IMPORTANT: the previous Claude default `claude-3-sonnet-20240229` was
 * RETIRED by Anthropic. Calls against it return 404 / "model not found",
 * which silently broke `app/api/cron/generate-daily-content` since launch.
 *
 * Override at runtime via env vars:
 *   CLAUDE_MODEL_ID  (e.g. "claude-sonnet-4-6", "claude-haiku-4-5")
 *   OPENAI_MODEL_ID  (e.g. "gpt-4o-mini", "gpt-4o", "gpt-5.1-mini")
 */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6"
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

export function resolveModelId(providerType: AIProviderType): string {
  if (providerType === "openai") {
    return process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL
  }
  if (providerType === "claude") {
    return process.env.CLAUDE_MODEL_ID || DEFAULT_CLAUDE_MODEL
  }
  return ""
}

// #210 — sélection du modèle par tâche, env-driven : greeting → Haiku (rapide,
// bon marché), chat → Sonnet (défaut), orientation → Opus (rare). OpenAI garde
// son modèle unique. Chaque défaut est surchargeable par variable d'env.
export const DEFAULT_CLAUDE_GREETING_MODEL = "claude-haiku-4-5"
export const DEFAULT_CLAUDE_ORIENTATION_MODEL = "claude-opus-4-1"

export type AITask = "chat" | "greeting" | "orientation"

export function resolveModelForTask(providerType: AIProviderType, task: AITask): string {
  if (providerType === "openai") {
    return process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL
  }
  if (task === "greeting") {
    return process.env.CLAUDE_GREETING_MODEL || DEFAULT_CLAUDE_GREETING_MODEL
  }
  if (task === "orientation") {
    return process.env.CLAUDE_ORIENTATION_MODEL || DEFAULT_CLAUDE_ORIENTATION_MODEL
  }
  return process.env.CLAUDE_MODEL_ID || DEFAULT_CLAUDE_MODEL
}

/**
 * #212 (DoD-5) — JSON garanti conforme, ZÉRO fallback regex.
 *
 * Chemin Claude (prod) : `callStructured` force le modèle à remplir le JSON
 * Schema ci-dessous via un tool-use → `tool_use.input` est déjà conforme, aucun
 * parsing. Chemin OpenAI (repli) : un SEUL `JSON.parse` du contenu (pas de
 * SmartJSONParser, pas de réparation/scan regex). Un objet vide/malformé renvoie
 * `null` → l'appelant retombe sur ses fallbacks curatés STATIQUES (non-regex).
 */
const QUIZ_SCHEMA: StructuredSchema = {
  name: "emit_quiz",
  description: "Émet un quiz éducatif conforme au format Nivy.",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      subject: { type: "string" },
      difficulty: { type: "string" },
      grade_level: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            // `correct` est hétérogène (index, booléen vrai/faux, ou liste
            // d'index pour les questions à réponses multiples) — laissé permissif.
            correct: {},
            explanation: { type: "string" },
          },
          required: ["question", "correct"],
        },
      },
      time_limit_minutes: { type: "number" },
      passing_score: { type: "number" },
      xp_reward: { type: "number" },
    },
    required: ["title", "subject", "questions"],
  },
}

const MISSION_SCHEMA: StructuredSchema = {
  name: "emit_mission",
  description: "Émet une mission/quête conforme au format Nivy.",
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      mission_type: { type: "string", enum: ["daily", "weekly", "monthly"] },
      category: { type: "string" },
      objective_type: { type: "string" },
      objective_target: { type: "number" },
      xp_reward: { type: "number" },
      difficulty: { type: "string" },
    },
    required: ["name"],
  },
}

const CHALLENGE_SCHEMA: StructuredSchema = {
  name: "emit_challenge",
  description: "Émet un défi quotidien conforme au format Nivy.",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      challenge_type: { type: "string" },
      xp_reward: { type: "number" },
      difficulty: { type: "string" },
      validation_type: { type: "string" },
    },
    required: ["title"],
  },
}

/**
 * Repli OpenAI : un seul `JSON.parse` (aucune réparation regex). Retire au plus
 * une paire de fences markdown ```…``` (nettoyage trivial, pas un scan d'accolades)
 * avant de parser. `null` si la chaîne n'est pas du JSON valide.
 */
function parseJsonOnce(response: string): Record<string, unknown> | null {
  const cleaned = (response || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export interface GenerationParams {
  contentType: ContentType
  category?: string
  gradeLevel?: string
  difficulty?: "easy" | "normal" | "hard" | "expert"
  interests?: string[]
  profiles?: string[] // School, Sport, Créa
  subject?: string // Pour les quiz
  count?: number
  customPrompt?: string
}

export interface GeneratedQuiz {
  title: string
  description: string
  subject: string
  difficulty: string
  grade_level?: string
  questions: Array<{
    question: string
    options: string[]
    correct: number
    explanation?: string
  }>
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

export interface GeneratedMission {
  name: string
  description: string
  mission_type: "daily" | "weekly" | "monthly"
  category: string
  objective_type: string
  objective_target: number
  xp_reward: number
  difficulty: string
}

export interface GeneratedChallenge {
  title: string
  description: string
  category: string
  challenge_type: string
  xp_reward: number
  difficulty: string
  validation_type?: string
}

export class ContentGenerator {
  private aiProvider: BaseAIProvider
  private validator: ContentValidator
  private factualValidator: FactualValidator
  private useFallback: boolean

  constructor(providerType: AIProviderType = "openai", useFallback: boolean = true) {
    const model = resolveModelId(providerType)
    this.aiProvider = AIProviderFactory.getProvider(providerType, model)
    this.validator = new ContentValidator()
    this.factualValidator = new FactualValidator()
    this.useFallback = useFallback
  }

  /**
   * #212 (DoD-5) — génération JSON conforme sans regex. Claude → tool-forced JSON
   * (objet déjà conforme au schéma). Repli OpenAI → un seul `JSON.parse`. Renvoie
   * l'objet brut + les métadonnées du provider (ou `null` si réponse vide/malformée).
   */
  private async generateStructured(
    systemPrompt: string,
    userPrompt: string,
    spec: StructuredSchema,
  ): Promise<{ data: Record<string, unknown> | null; metadata?: AIProviderMetadata }> {
    if (supportsStructured(this.aiProvider)) {
      const { data, metadata } = await this.aiProvider.callStructured<Record<string, unknown>>(
        systemPrompt,
        userPrompt,
        spec,
      )
      return { data: data && typeof data === "object" ? data : null, metadata }
    }
    const { content, metadata } = await this.aiProvider.call(systemPrompt, userPrompt)
    return { data: parseJsonOnce(content), metadata }
  }

  /**
   * Génère un quiz éducatif basé sur les paramètres
   */
  async generateQuiz(
    params: GenerationParams,
    teenContext?: TeenContext
  ): Promise<GeneratedQuiz | null> {
    const enhancedParams = InterestIntegration.integrateInterests(params, params.interests || []) as unknown as GenerationParams
    const systemPrompt = EnhancedQuizPrompts.getSystemPrompt()
    const userPrompt = EnhancedQuizPrompts.buildUserPrompt(enhancedParams, teenContext)
    
    const startTime = Date.now()

    try {
      const { data, metadata } = await this.generateStructured(systemPrompt, userPrompt, QUIZ_SCHEMA)
      const quiz = this.normalizeQuiz(data, params)

      if (!quiz) {
        return this.useFallback ? this.getFallbackQuiz(params) : null
      }

      // Safety filter (V1.1 P2.4) — block adult / unsafe themes BEFORE structural validation.
      const safety = checkContentSafety(quiz)
      logSafetyOutcome("quiz", quiz.title || "(untitled)", safety)
      if (!safety.isSafe) {
        return this.useFallback ? this.getFallbackQuiz(params) : null
      }

      // Validation
      const validation = await this.validator.validateQuiz(quiz)
      const factualValidation = await this.factualValidator.verifyFactualAccuracy(quiz)
      const combinedScore = (validation.score * 0.6) + (factualValidation.overall * 0.4)
      
      const isValid = validation.isValid && factualValidation.isValid && combinedScore >= 70
      
      if (!isValid) {
        console.warn("Generated quiz failed validation:", { combinedScore })
        if (combinedScore < 50 && this.useFallback) {
          return this.getFallbackQuiz(params)
        }
      }

      await this.validator.saveValidation("quiz", "pending", {
        ...validation,
        score: combinedScore,
        errors: [...validation.errors, ...factualValidation.errors]
      })

      await this.logGeneration({
        contentType: "quiz",
        params: enhancedParams,
        generatedContent: quiz,
        startTime,
        validationScore: combinedScore,
        requiresReview: !isValid,
        metadata
      })
      
      return quiz
    } catch (error) {
      console.error("Error generating quiz:", error)
      if (this.useFallback) return this.getFallbackQuiz(params)
      return null
    }
  }

  /**
   * Génère une mission/quête basée sur les paramètres
   */
  async generateMission(params: GenerationParams): Promise<GeneratedMission | null> {
    const systemPrompt = this.getMissionSystemPrompt()
    const userPrompt = this.buildMissionPrompt(params)
    const startTime = Date.now()

    try {
      const { data, metadata } = await this.generateStructured(systemPrompt, userPrompt, MISSION_SCHEMA)
      const mission = this.normalizeMission(data, params)

      if (!mission) {
        return this.useFallback ? this.getFallbackMission(params) : null
      }

      // Safety filter (V1.1 P2.4)
      const safety = checkContentSafety(mission)
      logSafetyOutcome("mission", mission.name || "(untitled)", safety)
      if (!safety.isSafe) {
        return this.useFallback ? this.getFallbackMission(params) : null
      }

      const validation = await this.validator.validateMission(mission)
      
      await this.validator.saveValidation("mission", "pending", validation)
      
      await this.logGeneration({
        contentType: "mission",
        params,
        generatedContent: mission,
        startTime,
        validationScore: validation.score,
        requiresReview: !validation.isValid || validation.requiresManualReview,
        metadata
      })
      
      return mission
    } catch (error) {
      console.error("Error generating mission:", error)
      if (this.useFallback) return this.getFallbackMission(params)
      return null
    }
  }

  /**
   * Génère un défi basé sur les paramètres
   */
  async generateChallenge(params: GenerationParams): Promise<GeneratedChallenge | null> {
    const systemPrompt = this.getChallengeSystemPrompt()
    const userPrompt = this.buildChallengePrompt(params)
    const startTime = Date.now()

    try {
      const { data, metadata } = await this.generateStructured(systemPrompt, userPrompt, CHALLENGE_SCHEMA)
      const challenge = this.normalizeChallenge(data, params)

      if (!challenge) {
        return this.useFallback ? this.getFallbackChallenge(params) : null
      }

      // Safety filter (V1.1 P2.4)
      const safety = checkContentSafety(challenge)
      logSafetyOutcome("challenge", challenge.title || "(untitled)", safety)
      if (!safety.isSafe) {
        return this.useFallback ? this.getFallbackChallenge(params) : null
      }

      await this.logGeneration({
        contentType: "challenge",
        params,
        generatedContent: challenge,
        startTime,
        metadata
      })

      return challenge
    } catch (error) {
      console.error("Error generating challenge:", error)
      if (this.useFallback) return this.getFallbackChallenge(params)
      return null
    }
  }

  private getMissionSystemPrompt(): string {
    return `Tu es un expert en création de missions et quêtes gamifiées pour adolescents marocains de 13 à 17 ans.

LANGUE: tout en français standard (V1), pas d'anglais, pas de Darija, pas d'arabe classique.

TON: encourageant, jamais culpabilisant. Pas d'urgence artificielle ("dernière chance"), pas de comparaison
sociale, pas d'emoji. Tutoiement neutre.

SENSIBILITÉ MAROCAINE: respecte le cadre halal — aucune mention d'alcool, de porc, de jeux d'argent,
de boîte de nuit, de drogue. Pas de politique, pas de monarchie, pas de Sahara, pas de religion comme thème.

SÉCURITÉ:
- Pas de défi physique extrême (ex: "100 pompes d'affilée pour débutant", "jeûner un repas").
- Pas de mission qui demande de rencontrer un inconnu hors-ligne.
- Pas de mission financière qui suppose des dépenses non encadrées par les parents.
- L'objectif doit être réalisable en 5-30 minutes pour un ado standard de 13 ans.

QUALITÉ:
- Mission concrète, mesurable, avec objectif numérique (objective_target) cohérent.
- Description claire, motivante, factuelle.
- xp_reward proportionnel à l'effort (10-50 XP pour une mission daily, 50-150 pour weekly).

FORMAT: réponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour.`
  }

  private getChallengeSystemPrompt(): string {
    return `Tu es un expert en création de défis quotidiens pour adolescents marocains de 13 à 17 ans.

LANGUE: tout en français standard (V1).

TON: encourageant, factuel, pas d'urgence artificielle, pas de jugement social.

SENSIBILITÉ MAROCAINE: contenu halal-friendly, pas de politique, pas de religion, pas d'alcool, pas de jeu d'argent.

SÉCURITÉ:
- Aucun défi physique dangereux ou non-calibré pour un débutant.
- Aucune incitation à rencontrer des inconnus hors-ligne.
- Aucun défi qui implique régime alimentaire restrictif ou comparaison de poids/apparence.

QUALITÉ:
- Défi réalisable en moins de 30 minutes.
- validation_type honnête (self_report par défaut).
- xp_reward 10-100 selon l'effort.

FORMAT: JSON strict, sans markdown ni texte autour.`
  }

  private buildMissionPrompt(params: GenerationParams): string {
    const context = []
    if (params.gradeLevel) context.push(`Niveau scolaire: ${params.gradeLevel}`)
    if (params.category) context.push(`Catégorie: ${params.category}`)
    if (params.profiles?.length) context.push(`Profils: ${params.profiles.join(", ")}`)
    if (params.interests?.length) context.push(`Intérêts: ${params.interests.join(", ")}`)

    return `Génère une mission/quête avec les caractéristiques suivantes:
${context.join("\n")}

Format JSON requis:
{
  "name": "Nom de la mission",
  "description": "Description détaillée",
  "mission_type": "daily",
  "category": "${params.category || "participation"}",
  "objective_type": "count",
  "objective_target": 1,
  "xp_reward": 50,
  "difficulty": "${params.difficulty || "normal"}"
}`
  }

  private buildChallengePrompt(params: GenerationParams): string {
    const context = []
    if (params.category) context.push(`Catégorie: ${params.category}`)
    if (params.profiles?.length) context.push(`Profils: ${params.profiles.join(", ")}`)
    if (params.interests?.length) context.push(`Intérêts: ${params.interests.join(", ")}`)

    return `Génère un défi avec les caractéristiques suivantes:
${context.join("\n")}

Format JSON requis:
{
  "title": "Titre du défi",
  "description": "Description",
  "category": "${params.category || "general"}",
  "challenge_type": "daily",
  "xp_reward": 50,
  "difficulty": "${params.difficulty || "normal"}",
  "validation_type": "self_report"
}`
  }

  // #212 — normalisation depuis l'OBJET déjà conforme (callStructured ou un seul
  // JSON.parse). Plus aucun parsing/regex : on valide juste la forme minimale puis
  // on complète les valeurs absentes par des défauts. `null` si invalide → fallback.
  private normalizeQuiz(
    parsed: Record<string, unknown> | null,
    params: GenerationParams,
  ): GeneratedQuiz | null {
    if (!parsed || typeof parsed.title !== "string") return null
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []
    const questions = rawQuestions
      .filter(
        (q): q is Record<string, unknown> =>
          !!q && typeof q === "object" && typeof (q as Record<string, unknown>).question === "string",
      )
      .map((q) => ({
        question: q.question as string,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        correct: (q.correct as number) ?? 0,
        explanation: typeof q.explanation === "string" ? q.explanation : undefined,
      }))
    if (questions.length === 0) return null
    return {
      title: parsed.title,
      description: typeof parsed.description === "string" ? parsed.description : "",
      subject: typeof parsed.subject === "string" ? parsed.subject : params.subject || "Général",
      difficulty: (parsed.difficulty as string) || params.difficulty || "normal",
      grade_level: typeof parsed.grade_level === "string" ? parsed.grade_level : params.gradeLevel,
      questions,
      time_limit_minutes: (parsed.time_limit_minutes as number) || 15,
      passing_score: (parsed.passing_score as number) || 60,
      xp_reward: (parsed.xp_reward as number) || 50,
    }
  }

  private normalizeMission(
    parsed: Record<string, unknown> | null,
    params: GenerationParams,
  ): GeneratedMission | null {
    if (!parsed || typeof parsed.name !== "string") return null
    return {
      name: parsed.name,
      description: typeof parsed.description === "string" ? parsed.description : "",
      mission_type: (parsed.mission_type as GeneratedMission["mission_type"]) || "daily",
      category: (parsed.category as string) || params.category || "participation",
      objective_type: (parsed.objective_type as string) || "count",
      objective_target: (parsed.objective_target as number) || 1,
      xp_reward: (parsed.xp_reward as number) || 50,
      difficulty: (parsed.difficulty as string) || params.difficulty || "normal",
    }
  }

  private normalizeChallenge(
    parsed: Record<string, unknown> | null,
    params: GenerationParams,
  ): GeneratedChallenge | null {
    if (!parsed || typeof parsed.title !== "string") return null
    return {
      title: parsed.title,
      description: typeof parsed.description === "string" ? parsed.description : "",
      category: (parsed.category as string) || params.category || "general",
      challenge_type: (parsed.challenge_type as string) || "daily",
      xp_reward: (parsed.xp_reward as number) || 50,
      difficulty: (parsed.difficulty as string) || params.difficulty || "normal",
      validation_type: (parsed.validation_type as string) || "self_report",
    }
  }

  private async logGeneration(data: {
    contentType: ContentType
    params: GenerationParams
    generatedContent?: any
    error?: string
    startTime?: number
    validationScore?: number
    requiresReview?: boolean
    metadata?: any
  }) {
    try {
      const supabase = await createClient()
      const generationTime = data.startTime ? Date.now() - data.startTime : 0

      await supabase.from("content_generation_logs").insert({
        content_type: data.contentType,
        target_type: "profile_based",
        generation_params: data.params,
        generated_content_type: data.generatedContent ? this.getContentTableName(data.contentType) : null,
        ai_provider: data.metadata?.provider || "unknown",
        ai_model: data.metadata?.model || "unknown",
        generation_time_ms: generationTime,
        quality_score: data.validationScore || null,
        requires_manual_review: data.requiresReview || false,
        status: data.error ? "failed" : "completed",
        error_message: data.error || null,
      })
    } catch (error) {
      console.error("Error logging generation:", error)
    }
  }

  private getContentTableName(contentType: ContentType): string {
    const mapping: Record<string, string> = {
      quiz: "educational_quizzes",
      mission: "mission_templates",
      challenge: "challenges_templates",
      daily_challenge: "challenges_templates",
      quest: "mission_templates",
    }
    return mapping[contentType] || "unknown"
  }

  private async getFallbackQuiz(params: GenerationParams): Promise<GeneratedQuiz | null> {
    try {
      const curated = await this.validator.getCuratedFallback("quiz", params.category, params.gradeLevel, 1)
      return curated.length > 0 ? curated[0].content_data as GeneratedQuiz : null
    } catch (error) {
      console.error("Error getting fallback quiz:", error)
      return null
    }
  }

  private async getFallbackMission(params: GenerationParams): Promise<GeneratedMission | null> {
    try {
      const curated = await this.validator.getCuratedFallback("mission", params.category, params.gradeLevel, 1)
      return curated.length > 0 ? curated[0].content_data as GeneratedMission : null
    } catch (error) {
      console.error("Error getting fallback mission:", error)
      return null
    }
  }

  private async getFallbackChallenge(params: GenerationParams): Promise<GeneratedChallenge | null> {
    try {
      const curated = await this.validator.getCuratedFallback("challenge", params.category, params.gradeLevel, 1)
      return curated.length > 0 ? curated[0].content_data as GeneratedChallenge : null
    } catch (error) {
      console.error("Error getting fallback challenge:", error)
      return null
    }
  }
}

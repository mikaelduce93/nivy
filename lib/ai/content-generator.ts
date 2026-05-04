/**
 * Content Generator Service
 * Génère automatiquement du contenu (quiz, quêtes, défis) basé sur le profil utilisateur
 * Supporte OpenAI et Anthropic Claude via Strategy Pattern
 */

import { createClient } from "@/lib/supabase/server"
import { ContentValidator } from "./content-validator"
import { EnhancedQuizPrompts, type TeenContext } from "./enhanced-quiz-prompts"
import { InterestIntegration } from "./interest-integration"
import { SmartJSONParser } from "./smart-json-parser"
import { FactualValidator } from "./factual-validator"
import { AIProviderFactory, type AIProviderType } from "./providers/factory"
import type { BaseAIProvider } from "./providers/base"

export type ContentType = "quiz" | "mission" | "challenge" | "daily_challenge" | "quest"
export { type AIProviderType as AIProvider }

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
  private jsonParser: SmartJSONParser
  private useFallback: boolean

  constructor(providerType: AIProviderType = "openai", useFallback: boolean = true) {
    const model = providerType === "openai" ? "gpt-4" : "claude-3-sonnet-20240229"
    this.aiProvider = AIProviderFactory.getProvider(providerType, model)
    this.validator = new ContentValidator()
    this.factualValidator = new FactualValidator()
    this.jsonParser = new SmartJSONParser()
    this.useFallback = useFallback
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
      const { content: response, metadata } = await this.aiProvider.call(systemPrompt, userPrompt)
      
      const quiz = this.jsonParser.parseQuizResponse(response, {
        gradeLevel: params.gradeLevel,
        difficulty: params.difficulty,
        subject: params.subject,
      }) as unknown as GeneratedQuiz
      
      if (!quiz) {
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
      const { content: response, metadata } = await this.aiProvider.call(systemPrompt, userPrompt)
      const mission = this.parseMissionResponse(response, params)
      
      if (!mission) {
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
      const { content: response, metadata } = await this.aiProvider.call(systemPrompt, userPrompt)
      const challenge = this.parseChallengeResponse(response, params)
      
      if (challenge) {
        await this.logGeneration({
          contentType: "challenge",
          params,
          generatedContent: challenge,
          startTime,
          metadata
        })
      }
      
      return challenge
    } catch (error) {
      console.error("Error generating challenge:", error)
      return null
    }
  }

  private getMissionSystemPrompt(): string {
    return `Tu es un expert en création de missions et quêtes gamifiées pour adolescents.
Tu crées des missions motivantes, réalisables et adaptées au profil de l'utilisateur.
Réponds UNIQUEMENT avec un JSON valide, sans texte supplémentaire.`
  }

  private getChallengeSystemPrompt(): string {
    return `Tu es un expert en création de défis pour adolescents.
Tu crées des défis adaptés aux intérêts et capacités de l'utilisateur.
Réponds UNIQUEMENT avec un JSON valide, sans texte supplémentaire.`
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

  private parseMissionResponse(response: string, params: GenerationParams): GeneratedMission | null {
    try {
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)
      
      return {
        name: parsed.name,
        description: parsed.description || "",
        mission_type: parsed.mission_type || "daily",
        category: parsed.category || params.category || "participation",
        objective_type: parsed.objective_type || "count",
        objective_target: parsed.objective_target || 1,
        xp_reward: parsed.xp_reward || 50,
        difficulty: parsed.difficulty || params.difficulty || "normal",
      }
    } catch (error) {
      console.error("Error parsing mission response:", error)
      return null
    }
  }

  private parseChallengeResponse(response: string, params: GenerationParams): GeneratedChallenge | null {
    try {
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)
      
      return {
        title: parsed.title,
        description: parsed.description || "",
        category: parsed.category || params.category || "general",
        challenge_type: parsed.challenge_type || "daily",
        xp_reward: parsed.xp_reward || 50,
        difficulty: parsed.difficulty || params.difficulty || "normal",
        validation_type: parsed.validation_type || "self_report",
      }
    } catch (error) {
      console.error("Error parsing challenge response:", error)
      return null
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
}

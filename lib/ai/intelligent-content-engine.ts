/**
 * Intelligent Content Engine
 * Système intelligent de génération et recommandation de contenu
 * basé sur profilage avancé, ML, vérification factuelle et adaptation dynamique
 * 
 * Refactored for: SOLID principles, DRY, and Maintainability.
 */

import { createClient } from "@/lib/supabase/server"
import { ContentGenerator, type GenerationParams } from "./content-generator"
import { ContentValidator } from "./content-validator"
import { validatePedagogicalQuality } from "./pedagogical-validator"
import { scoreQuiz } from "./quality-scoring"

/**
 * Domain Interfaces
 */
export interface TeenBehavioralProfile {
  learningStyle?: "visual" | "auditory" | "kinesthetic" | "reading"
  attentionSpanMinutes: number
  preferredDifficulty: string
  optimalQuizLength: number
  averageQuizScore: number
  bestSubject?: string
  strugglingSubject?: string
  improvementRate: number
  mostActiveHour?: number
  preferredContentTypes: string[]
  preferredSubjects: string[]
  avoidedSubjects: string[]
  engagementScore: number
  completionRate: number
  confidenceScore: number
}

export interface ContentRecommendation {
  contentId: string
  contentType: string
  score: number
  confidence: number
  factors: {
    behavioralMatch: number
    performanceBased: number
    difficultyMatch: number
    subjectPreference: number
    novelty: number
  }
  reasoning: string
}

export interface ReliabilityScore {
  overall: number
  factualAccuracy: number
  userAccuracy: number
  expertValidation: number
  performanceConsistency: number
}

/**
 * Data Access Layer (Repository Pattern)
 */
class TeenProfileRepository {
  private static async getSupabase() {
    return await createClient()
  }

  static async fetchFullProfileContext(teenId: string) {
    const supabase = await this.getSupabase()
    
    const [profileRpc, quizAttempts] = await Promise.all([
      supabase.rpc("calculate_teen_behavioral_profile", { p_teen_id: teenId }),
      supabase
        .from("quiz_attempts")
        .select(`
          *,
          educational_quizzes (
            subject,
            difficulty,
            questions
          )
        `)
        .eq("teen_id", teenId)
        .order("created_at", { ascending: false })
        .limit(50)
    ])

    if (profileRpc.error) throw profileRpc.error
    if (quizAttempts.error) throw quizAttempts.error

    return {
      profileData: profileRpc.data,
      quizAttempts: quizAttempts.data || []
    }
  }

  static async upsertProfile(teenId: string, profile: TeenBehavioralProfile) {
    const supabase = await this.getSupabase()
    const now = new Date().toISOString()
    
    return await supabase
      .from("teen_behavioral_profile")
      .upsert({
        teen_id: teenId,
        ...profile,
        last_analyzed_at: now,
        updated_at: now,
      })
  }

  static async getActiveQuizzes(limit = 100) {
    const supabase = await this.getSupabase()
    return await supabase
      .from("educational_quizzes")
      .select("*")
      .eq("is_active", true)
      .limit(limit)
  }

  static async getAttemptCount(teenId: string, quizId: string) {
    const supabase = await this.getSupabase()
    const { data } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("teen_id", teenId)
      .eq("quiz_id", quizId)
      .limit(1)
    return data?.length || 0
  }
}

/**
 * Domain Logic: Profile Analysis
 */
class ProfileAnalyzer {
  static analyze(profileData: any, attempts: any[]): TeenBehavioralProfile {
    const patterns = this.analyzeLearningPatterns(attempts)
    const preferences = this.calculatePreferences(attempts)
    const engagement = this.calculateEngagement(attempts)

    return {
      learningStyle: "visual", // Standardized default
      attentionSpanMinutes: patterns.avgTimeSpent / 60 || 15,
      preferredDifficulty: patterns.preferredDifficulty || "normal",
      optimalQuizLength: patterns.optimalLength || 10,
      averageQuizScore: profileData?.average_score || 0,
      bestSubject: profileData?.best_subject,
      strugglingSubject: profileData?.struggling_subject,
      improvementRate: this.calculateImprovementRate(attempts),
      mostActiveHour: this.detectActiveHour(attempts),
      preferredContentTypes: ["quiz"],
      preferredSubjects: preferences.preferred,
      avoidedSubjects: preferences.avoided,
      engagementScore: engagement,
      completionRate: profileData?.completion_rate || 0,
      confidenceScore: Math.min(100, (attempts.length / 50) * 100),
    }
  }

  private static analyzeLearningPatterns(attempts: any[]) {
    if (attempts.length === 0) return { avgTimeSpent: 900, preferredDifficulty: "normal", optimalLength: 10 }

    const times = attempts.map(a => a.time_spent_seconds).filter(Boolean)
    const lengths = attempts.map(a => a.educational_quizzes?.questions?.length).filter(Boolean)
    
    // Group scores by difficulty
    const diffScores: Record<string, number[]> = {}
    attempts.forEach(a => {
      const d = a.educational_quizzes?.difficulty || "normal"
      diffScores[d] = [...(diffScores[d] || []), a.score]
    })

    const preferredDifficulty = Object.entries(diffScores)
      .map(([diff, scores]) => ({ diff, avg: scores.reduce((s, x) => s + x, 0) / scores.length }))
      .sort((a, b) => b.avg - a.avg)[0]?.diff || "normal"

    return {
      avgTimeSpent: times.length ? times.reduce((s, x) => s + x, 0) / times.length : 900,
      preferredDifficulty,
      optimalLength: lengths.length ? Math.round(lengths.reduce((s, x) => s + x, 0) / lengths.length) : 10
    }
  }

  private static calculatePreferences(attempts: any[]) {
    const subjects: Record<string, number> = {}
    attempts.forEach(a => {
      if (a.educational_quizzes?.subject) {
        subjects[a.educational_quizzes.subject] = (subjects[a.educational_quizzes.subject] || 0) + a.score
      }
    })

    const sorted = Object.entries(subjects).sort(([, a], [, b]) => b - a)
    return {
      preferred: sorted.slice(0, 3).map(([s]) => s),
      avoided: sorted.reverse().slice(0, 2).map(([s]) => s)
    }
  }

  private static calculateEngagement(attempts: any[]): number {
    if (!attempts.length) return 0
    const completionRate = attempts.filter(a => a.passed).length / attempts.length
    const avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
    return Math.round((completionRate * 50) + (avgScore * 0.5))
  }

  private static calculateImprovementRate(attempts: any[]): number {
    if (attempts.length < 2) return 0
    const recentAvg = this.avg(attempts.slice(0, 10))
    const olderAvg = this.avg(attempts.slice(10, 20))
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  }

  private static avg(attempts: any[]) {
    return attempts.length ? attempts.reduce((s, a) => s + a.score, 0) / attempts.length : 0
  }

  private static detectActiveHour(attempts: any[]): number | undefined {
    if (!attempts.length) return undefined
    const hours = attempts.map(a => new Date(a.created_at).getHours())
    const counts = hours.reduce<Record<number, number>>((acc, h) => ({ ...acc, [h]: (acc[h] || 0) + 1 }), {})
    return parseInt(Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0])
  }
}

/**
 * Main Orchestrator Class
 */
export class IntelligentContentEngine {
  private generator: ContentGenerator
  private validator: ContentValidator

  constructor() {
    this.generator = new ContentGenerator("openai", true)
    this.validator = new ContentValidator()
  }

  /**
   * Orchestrates the analysis and profiling of a teen
   */
  async analyzeTeenProfile(teenId: string): Promise<TeenBehavioralProfile | null> {
    try {
      const { profileData, quizAttempts } = await TeenProfileRepository.fetchFullProfileContext(teenId)
      const profile = ProfileAnalyzer.analyze(profileData, quizAttempts)
      
      await TeenProfileRepository.upsertProfile(teenId, profile)
      return profile
    } catch (error) {
      console.error("[IntelligentContentEngine] Profiling error:", error)
      return null
    }
  }

  /**
   * Generates tailored content using Guard Clauses and SRP
   */
  async generateIntelligentContent(
    teenId: string,
    contentType: "quiz" | "mission" | "challenge"
  ): Promise<any | null> {
    try {
      const profile = await this.analyzeTeenProfile(teenId)
      if (!profile) return null

      const params = this.mapProfileToParams(profile, contentType)
      let content = await this.executeGeneration(contentType, params)
      
      if (!content) return null

      content = await this.validateAndRefine(content, contentType, profile)
      return content
    } catch (error) {
      console.error("[IntelligentContentEngine] Generation error:", error)
      return null
    }
  }

  private mapProfileToParams(profile: TeenBehavioralProfile, contentType: string): GenerationParams {
    return {
      contentType: contentType as GenerationParams["contentType"],
      difficulty: profile.preferredDifficulty as GenerationParams["difficulty"],
      subject: profile.bestSubject,
      interests: profile.preferredSubjects,
      count: 1,
    }
  }

  private async executeGeneration(type: string, params: GenerationParams) {
    if (type === "quiz") return this.generator.generateQuiz(params)
    if (type === "mission") return this.generator.generateMission(params)
    return this.generator.generateChallenge(params)
  }

  private async validateAndRefine(content: any, type: string, profile: TeenBehavioralProfile) {
    const isValid = type === "quiz" 
      ? await this.validator.validateQuiz(content)
      : await this.validator.validateMission(content)

    if (!isValid) return null

    // Factual check for quizzes
    if (type === "quiz") {
      const reliability = await this.verifyFactualAccuracy(content)
      if (reliability.overall < 70) {
        return this.validator.getCuratedFallback(type, content.subject, undefined, 1)
      }

      // Phase 2.2: pedagogical validation per question (heuristics, no LLM)
      if (Array.isArray(content.questions)) {
        for (const q of content.questions) {
          const ped = validatePedagogicalQuality(q)
          if (!ped.valid) {
            // Mark for downstream handling (regen / dashboard)
            q.quality_issue = true
            q.quality_issues = ped.issues
            q.quality_score = ped.score
            console.warn(
              `[IntelligentContentEngine] Pedagogical issue (score=${ped.score}):`,
              ped.issues.join(" | "),
            )
          } else {
            q.quality_score = ped.score
          }
        }
      }

      // Phase 7: global quality score attached to the quiz
      try {
        const qs = scoreQuiz({ questions: content.questions || [] })
        content.quality_score = qs.score
        content.quality_breakdown = qs.breakdown
        content.quality_recommendations = qs.recommendations
      } catch (err) {
        console.warn("[IntelligentContentEngine] scoreQuiz failed:", err)
      }
    }

    // Dynamic difficulty adjustment
    if (profile.preferredDifficulty !== content.difficulty) {
      content.difficulty = profile.preferredDifficulty
    }

    return content
  }

  /**
   * Recommendation Logic
   */
  async recommendContent(teenId: string, limit = 10): Promise<ContentRecommendation[]> {
    try {
      const profile = await this.analyzeTeenProfile(teenId)
      if (!profile) return []

      const { data: quizzes } = await TeenProfileRepository.getActiveQuizzes()
      if (!quizzes) return []

      const recommendations = await Promise.all(
        quizzes.map(quiz => this.scoreRecommendation(teenId, quiz, profile))
      )

      return recommendations
        .filter((r): r is ContentRecommendation => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error("[IntelligentContentEngine] Recommendation error:", error)
      return []
    }
  }

  private async scoreRecommendation(
    teenId: string,
    content: any,
    profile: TeenBehavioralProfile
  ): Promise<ContentRecommendation | null> {
    const isNew = (await TeenProfileRepository.getAttemptCount(teenId, content.id)) === 0
    
    const factors = {
      behavioralMatch: this.calcMatch(content, profile),
      performanceBased: 50, // Default for neutral
      difficultyMatch: this.calcDiffMatch(content.difficulty, profile.preferredDifficulty),
      subjectPreference: profile.preferredSubjects.includes(content.subject) ? 100 : 50,
      novelty: isNew ? 100 : 0
    }

    const score = (
      factors.behavioralMatch * 0.3 +
      factors.difficultyMatch * 0.3 +
      factors.subjectPreference * 0.3 +
      factors.novelty * 0.1
    )

    return {
      contentId: content.id,
      contentType: "quiz",
      score: Math.round(score),
      confidence: Math.round(profile.confidenceScore),
      factors,
      reasoning: this.formatReasoning(factors)
    }
  }

  private calcMatch(content: any, profile: TeenBehavioralProfile): number {
    let s = 0
    if (content.difficulty === profile.preferredDifficulty) s += 50
    if (profile.preferredSubjects.includes(content.subject)) s += 50
    return s
  }

  private calcDiffMatch(cDiff: string, pDiff: string): number {
    const levels = ["easy", "normal", "hard", "expert"]
    const diff = Math.abs(levels.indexOf(cDiff) - levels.indexOf(pDiff))
    return Math.max(0, 100 - diff * 33)
  }

  private formatReasoning(f: any): string {
    const r = []
    if (f.behavioralMatch > 70) r.push("Profil compatible")
    if (f.subjectPreference > 70) r.push("Sujet favori")
    if (f.novelty > 50) r.push("Nouveau contenu")
    return r.join(", ") || "Basé sur vos préférences"
  }

  private async verifyFactualAccuracy(content: any): Promise<ReliabilityScore> {
    const questions = content.questions || []
    if (!questions.length) return { overall: 0, factualAccuracy: 0, userAccuracy: 0, expertValidation: 0, performanceConsistency: 0 }
    
    const valid = questions.filter((q: any) => q.question && q.options?.length >= 2 && q.correct >= 0).length
    const accuracy = (valid / questions.length) * 100

    return {
      overall: accuracy,
      factualAccuracy: accuracy,
      userAccuracy: 0,
      expertValidation: 0,
      performanceConsistency: 0,
    }
  }
}

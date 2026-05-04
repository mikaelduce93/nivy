/**
 * TPM Content Engine - Système Adapté au Concept Teens Party Morocco
 * Génère du contenu intelligent pour les 3 piliers (School, Sport, Créa)
 * avec contexte marocain et intégration système de piliers
 */

import { createClient } from "@/lib/supabase/server"
import { IntelligentContentEngine } from "./intelligent-content-engine"

// NOTE: Ce fichier est remplacé par international-school-engine.ts
// qui supporte les écoles privées internationales (françaises, américaines, etc.)
// au lieu du programme public marocain

// Valeur XP : 1 XP = 0.10 DH
export const XP_VALUE_DH = 0.10

export interface PillarScores {
  school: number // 0-100
  sport: number // 0-100
  crea: number // 0-100
}

export interface TPMContentGenerationParams {
  teenId: string
  pillar?: "school" | "sport" | "crea" | "balanced"
  focusWeakPillars?: boolean
  targetXP?: number // Objectif XP à atteindre
}

export class TPMContentEngine extends IntelligentContentEngine {
  /**
   * Génère du contenu adapté au concept TPM
   */
  async generateTPMContent(params: TPMContentGenerationParams): Promise<any[]> {
    try {
      const supabase = await createClient()

      // 1. Récupérer les scores des piliers
      const { data: xpData } = await supabase
        .from("user_xp")
        .select("school_score, sport_score, crea_score, balance_multiplier")
        .eq("teen_id", params.teenId)
        .single()

      if (!xpData) {
        console.error("XP data not found for teen")
        return []
      }

      const pillarScores: PillarScores = {
        school: xpData.school_score || 50,
        sport: xpData.sport_score || 50,
        crea: xpData.crea_score || 50,
      }

      // 2. Déterminer quels piliers ont besoin de contenu
      const needsContent = this.analyzePillarNeeds(pillarScores, params)

      // 3. Générer du contenu pour chaque pilier nécessaire
      const generatedContent: any[] = []

      // PILIER SCHOOL
      if (needsContent.school) {
        const schoolContent = await this.generateSchoolContent(
          params.teenId,
          pillarScores.school,
          params.targetXP
        )
        generatedContent.push(...schoolContent)
      }

      // PILIER SPORT
      if (needsContent.sport) {
        const sportContent = await this.generateSportContent(
          params.teenId,
          pillarScores.sport,
          params.targetXP
        )
        generatedContent.push(...sportContent)
      }

      // PILIER CRÉA
      if (needsContent.crea) {
        const creaContent = await this.generateCreaContent(
          params.teenId,
          pillarScores.crea,
          params.targetXP
        )
        generatedContent.push(...creaContent)
      }

      // 4. Générer des missions équilibrées si tous piliers > 50
      if (this.isBalanced(pillarScores)) {
        const balancedMissions = await this.generateBalancedMissions(
          params.teenId,
          pillarScores,
          params.targetXP
        )
        generatedContent.push(...balancedMissions)
      }

      return generatedContent
    } catch (error) {
      console.error("Error generating TPM content:", error)
      return []
    }
  }

  /**
   * Analyse les besoins par pilier
   */
  private analyzePillarNeeds(
    scores: PillarScores,
    params: TPMContentGenerationParams
  ): { school: boolean; sport: boolean; crea: boolean } {
    const needs = {
      school: false,
      sport: false,
      crea: false,
    }

    // Si focus sur un pilier spécifique
    if (params.pillar === "school") {
      needs.school = true
      return needs
    }
    if (params.pillar === "sport") {
      needs.sport = true
      return needs
    }
    if (params.pillar === "crea") {
      needs.crea = true
      return needs
    }

    // Si focus sur piliers faibles
    if (params.focusWeakPillars) {
      needs.school = scores.school < 50
      needs.sport = scores.sport < 50
      needs.crea = scores.crea < 50
      return needs
    }

    // Par défaut : générer pour tous les piliers
    if (params.pillar === "balanced") {
      // Générer pour tous si équilibré, sinon pour les faibles
      if (this.isBalanced(scores)) {
        needs.school = true
        needs.sport = true
        needs.crea = true
      } else {
        needs.school = scores.school < 70
        needs.sport = scores.sport < 70
        needs.crea = scores.crea < 70
      }
    } else {
      // Générer pour tous
      needs.school = true
      needs.sport = true
      needs.crea = true
    }

    return needs
  }

  /**
   * Génère du contenu pour le pilier School
   */
  private async generateSchoolContent(
    teenId: string,
    schoolScore: number,
    targetXP?: number
  ): Promise<any[]> {
    const content: any[] = []

    // Récupérer le profil du teen
    const { data: teen } = await this.getTeenProfile(teenId)
    if (!teen) return []

    // Déterminer la matière à cibler
    const subject = await this.getTargetSubject(teenId, schoolScore)

    // Calculer la récompense XP adaptée
    const xpReward = this.calculateXPReward(schoolScore, targetXP)

    // Générer un quiz
    const quiz = await this.generateIntelligentContent(teenId, "quiz")
    if (quiz) {
      // Adapter pour le contexte marocain
      quiz.subject = subject
      quiz.grade_level = teen.grade_level
      quiz.xp_reward = xpReward
      content.push({
        type: "quiz",
        pillar: "school",
        content: quiz,
        xpReward,
        xpValueDH: xpReward * XP_VALUE_DH,
      })
    }

    // Générer une mission si score faible
    if (schoolScore < 50) {
      const mission = await this.generateSchoolMission(teenId, subject, xpReward)
      if (mission) {
        content.push({
          type: "mission",
          pillar: "school",
          content: mission,
          xpReward: mission.xp_reward,
          xpValueDH: mission.xp_reward * XP_VALUE_DH,
        })
      }
    }

    return content
  }

  /**
   * Génère du contenu pour le pilier Sport
   */
  private async generateSportContent(
    teenId: string,
    sportScore: number,
    targetXP?: number
  ): Promise<any[]> {
    const content: any[] = []

    const xpReward = this.calculateXPReward(sportScore, targetXP)

    // Générer un défi physique
    const challenge = await this.generateSportChallenge(teenId, sportScore, xpReward)
    if (challenge) {
      content.push({
        type: "challenge",
        pillar: "sport",
        content: challenge,
        xpReward: challenge.xp_reward,
        xpValueDH: challenge.xp_reward * XP_VALUE_DH,
      })
    }

    // Générer une mission si score faible
    if (sportScore < 50) {
      const mission = await this.generateSportMission(teenId, sportScore, xpReward)
      if (mission) {
        content.push({
          type: "mission",
          pillar: "sport",
          content: mission,
          xpReward: mission.xp_reward,
          xpValueDH: mission.xp_reward * XP_VALUE_DH,
        })
      }
    }

    return content
  }

  /**
   * Génère du contenu pour le pilier Créa
   */
  private async generateCreaContent(
    teenId: string,
    creaScore: number,
    targetXP?: number
  ): Promise<any[]> {
    const content: any[] = []

    const xpReward = this.calculateXPReward(creaScore, targetXP)

    // Générer un tutoriel créatif
    const tutorial = await this.generateCreaTutorial(teenId, creaScore, xpReward)
    if (tutorial) {
      content.push({
        type: "tutorial",
        pillar: "crea",
        content: tutorial,
        xpReward: tutorial.xp_reward,
        xpValueDH: tutorial.xp_reward * XP_VALUE_DH,
      })
    }

    // Générer une mission de création
    if (creaScore < 50) {
      const mission = await this.generateCreaMission(teenId, creaScore, xpReward)
      if (mission) {
        content.push({
          type: "mission",
          pillar: "crea",
          content: mission,
          xpReward: mission.xp_reward,
          xpValueDH: mission.xp_reward * XP_VALUE_DH,
        })
      }
    }

    return content
  }

  /**
   * Génère des missions équilibrées (tous piliers)
   */
  private async generateBalancedMissions(
    teenId: string,
    scores: PillarScores,
    targetXP?: number
  ): Promise<any[]> {
    const content: any[] = []

    // Mission qui touche les 3 piliers
    const balancedMission = {
      name: "Mission Équilibre - Triple Défi",
      description: "Complète une activité dans chaque pilier pour gagner un bonus équilibre",
      mission_type: "weekly" as const,
      category: "balance",
      objective_type: "combo",
      objective_target: 3,
      objective_config: {
        school: { type: "quiz_completed", target: 1 },
        sport: { type: "challenge_completed", target: 1 },
        crea: { type: "tutorial_completed", target: 1 },
      },
      xp_reward: this.calculateBalanceBonus(scores),
      difficulty: "normal" as const,
    }

    content.push({
      type: "mission",
      pillar: "balanced",
      content: balancedMission,
      xpReward: balancedMission.xp_reward,
      xpValueDH: balancedMission.xp_reward * XP_VALUE_DH,
      balanceBonus: true,
    })

    return content
  }

  /**
   * Calcule la récompense XP adaptée
   */
  private calculateXPReward(pillarScore: number, targetXP?: number): number {
    // Si objectif XP spécifié, adapter
    if (targetXP) {
      // Répartir l'objectif selon le score du pilier
      const baseReward = Math.floor(targetXP / 3) // Répartir sur 3 activités
      return baseReward
    }

    // Sinon, récompense basée sur le score
    if (pillarScore < 50) {
      return 100 // Plus de récompense pour encourager
    } else if (pillarScore < 70) {
      return 50
    } else {
      return 30
    }
  }

  /**
   * Calcule le bonus équilibre
   */
  private calculateBalanceBonus(scores: PillarScores): number {
    const minScore = Math.min(scores.school, scores.sport, scores.crea)

    if (minScore >= 85) {
      return 2000 // Bonus excellence
    } else if (minScore >= 70) {
      return 1000 // Bonus équilibre
    } else if (minScore >= 50) {
      return 500 // Bonus basique
    }

    return 0
  }

  /**
   * Vérifie si les piliers sont équilibrés
   */
  private isBalanced(scores: PillarScores): boolean {
    const minScore = Math.min(scores.school, scores.sport, scores.crea)
    return minScore >= 50
  }

  /**
   * Récupère le profil du teen
   */
  private async getTeenProfile(teenId: string) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("teens")
      .select("id, grade_level, interests, profiles")
      .eq("id", teenId)
      .single()
    return { data }
  }

  /**
   * Détermine la matière à cibler
   */
  private async getTargetSubject(teenId: string, schoolScore: number): Promise<string> {
    // Si score faible, cibler la matière en difficulté
    if (schoolScore < 50) {
      const profile = await this.analyzeTeenProfile(teenId)
      if (profile?.strugglingSubject) {
        return profile.strugglingSubject
      }
    }

    // Sinon, utiliser la meilleure matière pour maintenir
    const profile = await this.analyzeTeenProfile(teenId)
    return profile?.bestSubject || "math"
  }

  /**
   * Génère une mission School
   */
  private async generateSchoolMission(
    teenId: string,
    subject: string,
    xpReward: number
  ): Promise<any> {
    return {
      name: `Améliore-toi en ${subject}`,
      description: `Complète 3 quiz en ${subject} cette semaine`,
      mission_type: "weekly",
      category: "school",
      objective_type: "count",
      objective_target: 3,
      xp_reward: xpReward,
      difficulty: "normal",
    }
  }

  /**
   * Génère un défi Sport
   */
  private async generateSportChallenge(
    teenId: string,
    sportScore: number,
    xpReward: number
  ): Promise<any> {
    const challenges = [
      { title: "30 Pompes", description: "Fais 30 pompes aujourd'hui", xp_reward: xpReward },
      { title: "5km de Course", description: "Cours 5km cette semaine", xp_reward: xpReward * 2 },
      { title: "Planche 2 min", description: "Tiens la planche 2 minutes", xp_reward: xpReward },
    ]

    return challenges[Math.floor(Math.random() * challenges.length)]
  }

  /**
   * Génère une mission Sport
   */
  private async generateSportMission(
    teenId: string,
    sportScore: number,
    xpReward: number
  ): Promise<any> {
    return {
      name: "Active-toi !",
      description: "Complète 5 défis physiques cette semaine",
      mission_type: "weekly",
      category: "sport",
      objective_type: "count",
      objective_target: 5,
      xp_reward: xpReward,
      difficulty: "normal",
    }
  }

  /**
   * Génère un tutoriel Créa
   */
  private async generateCreaTutorial(
    teenId: string,
    creaScore: number,
    xpReward: number
  ): Promise<any> {
    return {
      title: "Tutoriel Créatif",
      description: "Apprends une nouvelle technique créative",
      content_type: "video",
      xp_reward: xpReward,
      difficulty: "normal",
    }
  }

  /**
   * Génère une mission Créa
   */
  private async generateCreaMission(
    teenId: string,
    creaScore: number,
    xpReward: number
  ): Promise<any> {
    return {
      name: "Exprime ta créativité",
      description: "Crée et partage 2 créations cette semaine",
      mission_type: "weekly",
      category: "crea",
      objective_type: "count",
      objective_target: 2,
      xp_reward: xpReward,
      difficulty: "normal",
    }
  }
}


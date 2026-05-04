/**
 * International School Content Engine
 * Adapté pour les écoles privées internationales au Maroc :
 * - Écoles françaises (programme français)
 * - Écoles américaines (programme américain)
 * - Autres écoles internationales
 */

import { createClient } from "@/lib/supabase/server"
import { IntelligentContentEngine } from "./intelligent-content-engine"

// Types d'écoles internationales
export type SchoolType = "french" | "american" | "british" | "ib" | "other" | "unknown"

// Matières selon le type d'école
export const SUBJECTS_BY_SCHOOL_TYPE: Record<SchoolType, Array<{ id: string; label: string; labelEn?: string }>> = {
  // Programme français
  french: [
    { id: "math", label: "Mathématiques" },
    { id: "french", label: "Français" },
    { id: "english", label: "Anglais" },
    { id: "spanish", label: "Espagnol" },
    { id: "german", label: "Allemand" },
    { id: "physics", label: "Physique-Chimie" },
    { id: "svt", label: "SVT (Sciences de la Vie et de la Terre)" },
    { id: "history", label: "Histoire-Géographie" },
    { id: "philosophy", label: "Philosophie" },
    { id: "economics", label: "SES (Sciences Économiques et Sociales)" },
    { id: "art", label: "Arts Plastiques" },
    { id: "music", label: "Éducation Musicale" },
    { id: "sport", label: "EPS (Éducation Physique et Sportive)" },
  ],
  
  // Programme américain
  american: [
    { id: "math", label: "Mathematics", labelEn: "Mathematics" },
    { id: "english", label: "English Language Arts", labelEn: "English Language Arts" },
    { id: "science", label: "Science", labelEn: "Science" },
    { id: "biology", label: "Biology", labelEn: "Biology" },
    { id: "chemistry", label: "Chemistry", labelEn: "Chemistry" },
    { id: "physics", label: "Physics", labelEn: "Physics" },
    { id: "history", label: "History", labelEn: "History" },
    { id: "social_studies", label: "Social Studies", labelEn: "Social Studies" },
    { id: "french", label: "French", labelEn: "French" },
    { id: "spanish", label: "Spanish", labelEn: "Spanish" },
    { id: "art", label: "Art", labelEn: "Art" },
    { id: "music", label: "Music", labelEn: "Music" },
    { id: "pe", label: "Physical Education", labelEn: "Physical Education" },
    { id: "computer_science", label: "Computer Science", labelEn: "Computer Science" },
  ],
  
  // Programme britannique
  british: [
    { id: "math", label: "Mathematics" },
    { id: "english", label: "English" },
    { id: "science", label: "Science" },
    { id: "biology", label: "Biology" },
    { id: "chemistry", label: "Chemistry" },
    { id: "physics", label: "Physics" },
    { id: "history", label: "History" },
    { id: "geography", label: "Geography" },
    { id: "french", label: "French" },
    { id: "spanish", label: "Spanish" },
    { id: "art", label: "Art & Design" },
    { id: "music", label: "Music" },
    { id: "pe", label: "Physical Education" },
  ],
  
  // Programme IB (International Baccalaureate)
  ib: [
    { id: "math", label: "Mathematics" },
    { id: "english", label: "English" },
    { id: "french", label: "French" },
    { id: "spanish", label: "Spanish" },
    { id: "biology", label: "Biology" },
    { id: "chemistry", label: "Chemistry" },
    { id: "physics", label: "Physics" },
    { id: "history", label: "History" },
    { id: "economics", label: "Economics" },
    { id: "psychology", label: "Psychology" },
    { id: "art", label: "Visual Arts" },
    { id: "music", label: "Music" },
    { id: "tok", label: "Theory of Knowledge" },
  ],
  
  // Autre / Inconnu
  other: [
    { id: "math", label: "Mathématiques" },
    { id: "french", label: "Français" },
    { id: "english", label: "Anglais" },
    { id: "science", label: "Sciences" },
    { id: "history", label: "Histoire" },
    { id: "art", label: "Arts" },
    { id: "music", label: "Musique" },
    { id: "sport", label: "Sport" },
  ],
  
  unknown: [
    { id: "math", label: "Mathématiques" },
    { id: "french", label: "Français" },
    { id: "english", label: "Anglais" },
  ],
}

// Niveaux selon le type d'école
export const GRADE_LEVELS_BY_SCHOOL_TYPE: Record<SchoolType, string[]> = {
  french: [
    "CM2", "6ème", "5ème", "4ème", "3ème", 
    "2nde", "1ère", "Terminale"
  ],
  american: [
    "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
    "Grade 10", "Grade 11", "Grade 12"
  ],
  british: [
    "Year 6", "Year 7", "Year 8", "Year 9", "Year 10",
    "Year 11", "Year 12", "Year 13"
  ],
  ib: [
    "MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5",
    "DP 1", "DP 2"
  ],
  other: [
    "Level 1", "Level 2", "Level 3", "Level 4",
    "Level 5", "Level 6", "Level 7", "Level 8"
  ],
  unknown: ["Unknown"],
}

// Valeur XP : 1 XP = 0.10 DH
export const XP_VALUE_DH = 0.10

export interface InternationalSchoolProfile {
  schoolType: SchoolType
  schoolName: string
  gradeLevel: string
  subjects: string[]
  curriculum: string
}

export interface TPMContentGenerationParams {
  teenId: string
  pillar?: "school" | "sport" | "crea" | "balanced"
  focusWeakPillars?: boolean
  targetXP?: number
}

export class InternationalSchoolEngine extends IntelligentContentEngine {
  /**
   * Détecte le type d'école depuis le nom
   */
  detectSchoolType(schoolName: string | null): SchoolType {
    if (!schoolName) return "unknown"

    const name = schoolName.toLowerCase()

    // Écoles françaises
    if (
      name.includes("lycée") ||
      name.includes("lycee") ||
      name.includes("collège") ||
      name.includes("college") ||
      name.includes("école française") ||
      name.includes("ecole francaise") ||
      name.includes("french school") ||
      name.includes("lycée français") ||
      name.includes("lycee francais")
    ) {
      return "french"
    }

    // Écoles américaines
    if (
      name.includes("american school") ||
      name.includes("academy") ||
      name.includes("high school") ||
      name.includes("middle school") ||
      name.includes("elementary") ||
      name.includes("grade school")
    ) {
      return "american"
    }

    // Écoles britanniques
    if (
      name.includes("british school") ||
      name.includes("international school") ||
      name.includes("british international")
    ) {
      return "british"
    }

    // IB
    if (
      name.includes("ib school") ||
      name.includes("international baccalaureate") ||
      name.includes("myp") ||
      name.includes("dp")
    ) {
      return "ib"
    }

    return "other"
  }

  /**
   * Récupère le profil scolaire international
   */
  async getInternationalSchoolProfile(teenId: string): Promise<InternationalSchoolProfile | null> {
    try {
      const supabase = await createClient()

      const { data: teen } = await supabase
        .from("teens")
        .select("school, grade_level")
        .eq("id", teenId)
        .single()

      if (!teen) return null

      const schoolType = this.detectSchoolType(teen.school)
      const subjects = SUBJECTS_BY_SCHOOL_TYPE[schoolType] || SUBJECTS_BY_SCHOOL_TYPE.unknown
      const gradeLevels = GRADE_LEVELS_BY_SCHOOL_TYPE[schoolType] || GRADE_LEVELS_BY_SCHOOL_TYPE.unknown

      return {
        schoolType,
        schoolName: teen.school || "Unknown",
        gradeLevel: teen.grade_level || gradeLevels[0],
        subjects: subjects.map((s) => s.id),
        curriculum: this.getCurriculumName(schoolType),
      }
    } catch (error) {
      console.error("Error getting international school profile:", error)
      return null
    }
  }

  /**
   * Retourne le nom du curriculum
   */
  private getCurriculumName(schoolType: SchoolType): string {
    const names: Record<SchoolType, string> = {
      french: "Programme Français",
      american: "American Curriculum",
      british: "British Curriculum",
      ib: "International Baccalaureate",
      other: "Autre Programme",
      unknown: "Programme Inconnu",
    }
    return names[schoolType]
  }

  /**
   * Génère du contenu adapté au programme international
   */
  async generateInternationalContent(
    params: TPMContentGenerationParams
  ): Promise<any[]> {
    try {
      // 1. Récupérer le profil scolaire international
      const schoolProfile = await this.getInternationalSchoolProfile(params.teenId)
      if (!schoolProfile) {
        console.error("Could not determine school profile")
        return []
      }

      // 2. Récupérer les scores des piliers
      const supabase = await createClient()
      const { data: xpData } = await supabase
        .from("user_xp")
        .select("school_score, sport_score, crea_score, balance_multiplier")
        .eq("teen_id", params.teenId)
        .single()

      if (!xpData) {
        console.error("XP data not found")
        return []
      }

      const pillarScores = {
        school: xpData.school_score || 50,
        sport: xpData.sport_score || 50,
        crea: xpData.crea_score || 50,
      }

      // 3. Générer du contenu adapté au programme
      const generatedContent: any[] = []

      // PILIER SCHOOL - Adapté au programme
      if (params.pillar === "school" || !params.pillar) {
        const schoolContent = await this.generateSchoolContentInternational(
          params.teenId,
          schoolProfile,
          pillarScores.school,
          params.targetXP
        )
        generatedContent.push(...schoolContent)
      }

      // PILIER SPORT (identique pour tous)
      if (params.pillar === "sport" || !params.pillar) {
        const sportContent = await this.generateSportContent(
          params.teenId,
          pillarScores.sport,
          params.targetXP
        )
        generatedContent.push(...sportContent)
      }

      // PILIER CRÉA (identique pour tous)
      if (params.pillar === "crea" || !params.pillar) {
        const creaContent = await this.generateCreaContent(
          params.teenId,
          pillarScores.crea,
          params.targetXP
        )
        generatedContent.push(...creaContent)
      }

      return generatedContent
    } catch (error) {
      console.error("Error generating international content:", error)
      return []
    }
  }

  /**
   * Génère du contenu School adapté au programme international
   */
  private async generateSchoolContentInternational(
    teenId: string,
    schoolProfile: InternationalSchoolProfile,
    schoolScore: number,
    targetXP?: number
  ): Promise<any[]> {
    const content: any[] = []

    // Déterminer la matière à cibler
    const subject = await this.getTargetSubjectInternational(teenId, schoolProfile, schoolScore)

    // Calculer la récompense XP
    const xpReward = this.calculateXPReward(schoolScore, targetXP)

    // Générer un quiz adapté au programme
    const quiz = await this.generateIntelligentContent(teenId, "quiz")
    if (quiz) {
      // Adapter pour le programme spécifique
      quiz.subject = subject
      quiz.grade_level = schoolProfile.gradeLevel
      quiz.curriculum = schoolProfile.curriculum
      quiz.school_type = schoolProfile.schoolType
      quiz.xp_reward = xpReward

      // Adapter le prompt selon le programme
      const adaptedQuiz = await this.adaptQuizToCurriculum(quiz, schoolProfile)

      content.push({
        type: "quiz",
        pillar: "school",
        curriculum: schoolProfile.curriculum,
        schoolType: schoolProfile.schoolType,
        content: adaptedQuiz,
        xpReward,
        xpValueDH: xpReward * XP_VALUE_DH,
      })
    }

    return content
  }

  /**
   * Adapte un quiz au curriculum spécifique
   */
  private async adaptQuizToCurriculum(
    quiz: any,
    schoolProfile: InternationalSchoolProfile
  ): Promise<any> {
    // Adapter les questions selon le programme
    if (schoolProfile.schoolType === "french") {
      // Programme français : adapter la terminologie, les exemples
      quiz.title = this.adaptTitleForFrench(quiz.title, quiz.subject)
      quiz.questions = quiz.questions?.map((q: any) => ({
        ...q,
        question: this.adaptQuestionForFrench(q.question, quiz.subject),
      }))
    } else if (schoolProfile.schoolType === "american") {
      // Programme américain : adapter en anglais
      quiz.title = this.adaptTitleForAmerican(quiz.title, quiz.subject)
      quiz.questions = quiz.questions?.map((q: any) => ({
        ...q,
        question: this.adaptQuestionForAmerican(q.question, quiz.subject),
      }))
    }

    return quiz
  }

  /**
   * Adapte le titre pour le programme français
   */
  private adaptTitleForFrench(title: string, subject: string): string {
    // Exemples d'adaptation
    if (subject === "math") {
      return title.replace(/Mathematics/gi, "Mathématiques")
    }
    if (subject === "science") {
      return title.replace(/Science/gi, "Sciences")
    }
    return title
  }

  /**
   * Adapte le titre pour le programme américain
   */
  private adaptTitleForAmerican(title: string, subject: string): string {
    // Garder en anglais ou traduire si nécessaire
    return title
  }

  /**
   * Adapte une question pour le programme français
   */
  private adaptQuestionForFrench(question: string, subject: string): string {
    // Adapter la terminologie française
    return question
  }

  /**
   * Adapte une question pour le programme américain
   */
  private adaptQuestionForAmerican(question: string, subject: string): string {
    // Garder en anglais
    return question
  }

  /**
   * Détermine la matière à cibler selon le programme
   */
  private async getTargetSubjectInternational(
    teenId: string,
    schoolProfile: InternationalSchoolProfile,
    schoolScore: number
  ): Promise<string> {
    // Si score faible, cibler la matière en difficulté
    if (schoolScore < 50) {
      const profile = await this.analyzeTeenProfile(teenId)
      if (profile?.strugglingSubject) {
        // Vérifier que la matière existe dans le programme
        if (schoolProfile.subjects.includes(profile.strugglingSubject)) {
          return profile.strugglingSubject
        }
      }
    }

    // Sinon, utiliser la meilleure matière
    const profile = await this.analyzeTeenProfile(teenId)
    if (profile?.bestSubject && schoolProfile.subjects.includes(profile.bestSubject)) {
      return profile.bestSubject
    }

    // Par défaut : Math (présent dans tous les programmes)
    return "math"
  }

  /**
   * Calcule la récompense XP adaptée
   */
  private calculateXPReward(pillarScore: number, targetXP?: number): number {
    if (targetXP) {
      return Math.floor(targetXP / 3)
    }

    if (pillarScore < 50) {
      return 100
    } else if (pillarScore < 70) {
      return 50
    } else {
      return 30
    }
  }

  /**
   * Génère du contenu Sport (identique pour tous)
   */
  private async generateSportContent(
    teenId: string,
    sportScore: number,
    targetXP?: number
  ): Promise<any[]> {
    // Utiliser la méthode parente
    return []
  }

  /**
   * Génère du contenu Créa (identique pour tous)
   */
  private async generateCreaContent(
    teenId: string,
    creaScore: number,
    targetXP?: number
  ): Promise<any[]> {
    // Utiliser la méthode parente
    return []
  }
}



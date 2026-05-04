/**
 * Content Validator Service
 * Valide et vérifie la qualité du contenu généré par l'IA
 */

import { createClient } from "@/lib/supabase/server"

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: string[]
  warnings: string[]
  checks: Record<string, boolean>
  requiresManualReview: boolean
}

export interface QuizValidationRules {
  minQuestions?: number
  maxQuestions?: number
  minQuestionLength?: number
  minOptionsCount?: number
  requireExplanations?: boolean
  requireSubject?: boolean
  requireGradeLevel?: boolean
}

export interface MissionValidationRules {
  minDescriptionLength?: number
  requireObjectives?: boolean
  requireCategory?: boolean
}

export class ContentValidator {
  /**
   * Valide un quiz généré
   */
  async validateQuiz(quiz: any, rules?: QuizValidationRules): Promise<ValidationResult> {
    const defaultRules: QuizValidationRules = {
      minQuestions: 5,
      maxQuestions: 15,
      minQuestionLength: 10,
      minOptionsCount: 2,
      requireExplanations: false,
      requireSubject: true,
      requireGradeLevel: true,
    }

    const validationRules = { ...defaultRules, ...rules }
    const errors: string[] = []
    const warnings: string[] = []
    const checks: Record<string, boolean> = {}
    let score = 0

    // Vérifier le titre
    checks.hasTitle = !!quiz.title && quiz.title.trim().length >= 5
    if (!checks.hasTitle) {
      errors.push("Le titre est manquant ou trop court (minimum 5 caractères)")
    } else {
      score += 10
    }

    // Vérifier la description
    checks.hasDescription = !!quiz.description && quiz.description.trim().length >= 20
    if (!checks.hasDescription) {
      warnings.push("La description est trop courte (minimum 20 caractères recommandé)")
    } else {
      score += 10
    }

    // Vérifier la matière
    checks.hasSubject = !!quiz.subject && quiz.subject.trim().length > 0
    if (validationRules.requireSubject && !checks.hasSubject) {
      errors.push("La matière est requise")
    } else if (checks.hasSubject) {
      score += 10
    }

    // Vérifier le niveau scolaire
    checks.hasGradeLevel = !!quiz.grade_level
    if (validationRules.requireGradeLevel && !checks.hasGradeLevel) {
      warnings.push("Le niveau scolaire n'est pas spécifié")
    } else if (checks.hasGradeLevel) {
      score += 10
    }

    // Vérifier la difficulté
    checks.hasDifficulty = !!quiz.difficulty && ["easy", "normal", "hard", "expert"].includes(quiz.difficulty)
    if (!checks.hasDifficulty) {
      warnings.push("La difficulté n'est pas valide")
    } else {
      score += 10
    }

    // Vérifier les questions
    checks.hasQuestions = Array.isArray(quiz.questions) && quiz.questions.length > 0
    if (!checks.hasQuestions) {
      errors.push("Aucune question dans le quiz")
      return {
        isValid: false,
        score: 0,
        errors,
        warnings,
        checks,
        requiresManualReview: true,
      }
    }

    const questionCount = quiz.questions.length
    checks.questionCountValid = questionCount >= (validationRules.minQuestions || 5) && 
                                 questionCount <= (validationRules.maxQuestions || 15)

    if (questionCount < (validationRules.minQuestions || 5)) {
      errors.push(`Trop peu de questions (minimum ${validationRules.minQuestions || 5} requis)`)
    } else if (questionCount > (validationRules.maxQuestions || 15)) {
      warnings.push(`Trop de questions (maximum ${validationRules.maxQuestions || 15} recommandé)`)
    } else {
      score += 20
    }

    // Valider chaque question
    let validQuestions = 0
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i]
      const questionValid = this.validateQuestion(question, i, validationRules, errors, warnings)
      if (questionValid) {
        validQuestions++
      }
    }

    if (validQuestions === questionCount) {
      score += 20
    } else {
      warnings.push(`${questionCount - validQuestions} question(s) invalide(s)`)
    }

    // Vérifier la cohérence des réponses
    const answerConsistency = this.checkAnswerConsistency(quiz.questions)
    if (!answerConsistency.isConsistent) {
      errors.push(...answerConsistency.errors)
    } else {
      score += 10
    }

    // Déterminer si une revue manuelle est nécessaire
    const requiresManualReview = 
      errors.length > 0 || 
      score < 70 || 
      warnings.length > 3 ||
      validQuestions < questionCount * 0.8

    return {
      isValid: errors.length === 0 && score >= 70,
      score: Math.min(100, score),
      errors,
      warnings,
      checks,
      requiresManualReview,
    }
  }

  /**
   * Valide une question individuelle
   */
  private validateQuestion(
    question: any,
    index: number,
    rules: QuizValidationRules,
    errors: string[],
    warnings: string[]
  ): boolean {
    let isValid = true

    // Vérifier le texte de la question
    if (!question.question || question.question.trim().length < (rules.minQuestionLength || 10)) {
      errors.push(`Question ${index + 1}: Texte trop court ou manquant`)
      isValid = false
    }

    // Vérifier les options
    if (!Array.isArray(question.options) || question.options.length < (rules.minOptionsCount || 2)) {
      errors.push(`Question ${index + 1}: Pas assez d'options (minimum ${rules.minOptionsCount || 2})`)
      isValid = false
    } else {
      // Vérifier que toutes les options ont du contenu
      const emptyOptions = question.options.filter((opt: string) => !opt || opt.trim().length === 0)
      if (emptyOptions.length > 0) {
        errors.push(`Question ${index + 1}: ${emptyOptions.length} option(s) vide(s)`)
        isValid = false
      }
    }

    // Vérifier la réponse correcte
    if (question.correct === undefined || question.correct === null) {
      errors.push(`Question ${index + 1}: Réponse correcte non spécifiée`)
      isValid = false
    } else if (question.correct < 0 || question.correct >= (question.options?.length || 0)) {
      errors.push(`Question ${index + 1}: Index de réponse correcte invalide`)
      isValid = false
    }

    // Vérifier les explications (optionnel)
    if (rules.requireExplanations && !question.explanation) {
      warnings.push(`Question ${index + 1}: Explication manquante`)
    }

    return isValid
  }

  /**
   * Vérifie la cohérence des réponses (pas toutes la même option, etc.)
   */
  private checkAnswerConsistency(questions: any[]): { isConsistent: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Vérifier que les réponses ne sont pas toutes sur la même option
    const answerDistribution: Record<number, number> = {}
    questions.forEach((q) => {
      if (q.correct !== undefined) {
        answerDistribution[q.correct] = (answerDistribution[q.correct] || 0) + 1
      }
    })

    const maxSameAnswer = Math.max(...Object.values(answerDistribution), 0)
    if (maxSameAnswer > questions.length * 0.5) {
      errors.push("Trop de réponses correctes sur la même option (possible biais)")
    }

    // Vérifier qu'il n'y a pas de doublons de questions
    const questionTexts = questions.map((q) => q.question?.toLowerCase().trim())
    const duplicates = questionTexts.filter((text, index) => questionTexts.indexOf(text) !== index)
    if (duplicates.length > 0) {
      errors.push(`${duplicates.length} question(s) en double détectée(s)`)
    }

    return {
      isConsistent: errors.length === 0,
      errors,
    }
  }

  /**
   * Valide une mission générée
   */
  async validateMission(mission: any, rules?: MissionValidationRules): Promise<ValidationResult> {
    const defaultRules: MissionValidationRules = {
      minDescriptionLength: 50,
      requireObjectives: true,
      requireCategory: true,
    }

    const validationRules = { ...defaultRules, ...rules }
    const errors: string[] = []
    const warnings: string[] = []
    const checks: Record<string, boolean> = {}
    let score = 0

    // Vérifier le nom
    checks.hasName = !!mission.name && mission.name.trim().length >= 5
    if (!checks.hasName) {
      errors.push("Le nom de la mission est manquant ou trop court")
    } else {
      score += 20
    }

    // Vérifier la description
    checks.hasDescription = !!mission.description && 
                            mission.description.trim().length >= (validationRules.minDescriptionLength || 50)
    if (!checks.hasDescription) {
      errors.push(`La description est trop courte (minimum ${validationRules.minDescriptionLength || 50} caractères)`)
    } else {
      score += 30
    }

    // Vérifier la catégorie
    checks.hasCategory = !!mission.category
    if (validationRules.requireCategory && !checks.hasCategory) {
      errors.push("La catégorie est requise")
    } else if (checks.hasCategory) {
      score += 15
    }

    // Vérifier les objectifs
    checks.hasObjectives = !!mission.objective_type && !!mission.objective_target
    if (validationRules.requireObjectives && !checks.hasObjectives) {
      errors.push("Les objectifs sont requis")
    } else if (checks.hasObjectives) {
      score += 20
    }

    // Vérifier le type de mission
    checks.hasMissionType = !!mission.mission_type && 
                           ["daily", "weekly", "monthly", "seasonal"].includes(mission.mission_type)
    if (!checks.hasMissionType) {
      warnings.push("Type de mission invalide ou manquant")
    } else {
      score += 15
    }

    const requiresManualReview = errors.length > 0 || score < 70

    return {
      isValid: errors.length === 0 && score >= 70,
      score: Math.min(100, score),
      errors,
      warnings,
      checks,
      requiresManualReview,
    }
  }

  /**
   * Sauvegarde le résultat de validation dans la base de données
   */
  async saveValidation(
    contentType: string,
    contentId: string,
    validation: ValidationResult
  ): Promise<string | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from("content_validations")
        .insert({
          content_type: contentType,
          content_id: contentId,
          validation_status: validation.isValid ? "auto_validated" : 
                           validation.requiresManualReview ? "manual_review" : "auto_rejected",
          auto_validation_score: validation.score,
          auto_validation_checks: validation.checks,
          has_errors: validation.errors.length > 0,
          has_warnings: validation.warnings.length > 0,
          error_details: validation.errors,
          warning_details: validation.warnings,
          quality_metrics: {
            score: validation.score,
            error_count: validation.errors.length,
            warning_count: validation.warnings.length,
          },
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error saving validation:", error)
        return null
      }

      return data?.id || null
    } catch (error) {
      console.error("Error in saveValidation:", error)
      return null
    }
  }

  /**
   * Récupère du contenu curated en fallback
   */
  async getCuratedFallback(
    contentType: string,
    category?: string,
    gradeLevel?: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc("get_curated_content_fallback", {
        p_content_type: contentType,
        p_category: category || null,
        p_grade_level: gradeLevel || null,
        p_limit: limit,
      })

      if (error) {
        console.error("Error fetching curated content:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in getCuratedFallback:", error)
      return []
    }
  }
}



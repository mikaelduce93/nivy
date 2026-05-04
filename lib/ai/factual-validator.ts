/**
 * Factual Validator
 * Vérifie la validité factuelle des quiz générés
 */

export interface GeneratedQuiz {
  title: string
  description: string
  subject: string
  difficulty: string
  grade_level?: string
  questions: Array<{
    type?: string
    question: string
    options?: string[]
    correct: number | boolean | number[]
    explanation?: string
  }>
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

export interface FactualValidationResult {
  overall: number // Score global 0-100
  questionScores: number[] // Score par question
  errors: string[] // Erreurs détectées
  warnings: string[] // Avertissements
  isValid: boolean // Si le quiz est globalement valide
}

export class FactualValidator {
  /**
   * Vérifie la validité factuelle d'un quiz complet
   */
  async verifyFactualAccuracy(quiz: GeneratedQuiz): Promise<FactualValidationResult> {
    const questionScores: number[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Vérifier chaque question
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i]
      const validation = await this.verifyQuestion(question, quiz.subject, i + 1)
      
      questionScores.push(validation.score)
      
      if (validation.score < 70) {
        errors.push(`Question ${i + 1}: ${validation.issue || "Score faible"}`)
      } else if (validation.score < 85) {
        warnings.push(`Question ${i + 1}: ${validation.issue || "Amélioration possible"}`)
      }
    }

    // Vérifier la cohérence globale
    const consistencyCheck = this.checkGlobalConsistency(quiz)
    if (!consistencyCheck.isConsistent) {
      errors.push(...consistencyCheck.errors)
    }

    // Calculer le score global
    const overall = questionScores.length > 0
      ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
      : 0

    // Ajuster le score global selon les erreurs de cohérence
    const finalScore = consistencyCheck.isConsistent ? overall : overall * 0.8

    return {
      overall: Math.round(finalScore),
      questionScores,
      errors,
      warnings,
      isValid: finalScore >= 70 && errors.length === 0
    }
  }

  /**
   * Vérifie une question individuelle
   */
  private async verifyQuestion(
    question: any,
    subject: string,
    questionNumber: number
  ): Promise<{ score: number; issue?: string }> {
    let score = 100
    const issues: string[] = []

    // Vérification 1: La question existe et est suffisamment longue
    if (!question.question || typeof question.question !== "string") {
      return { score: 0, issue: "Question manquante" }
    }

    if (question.question.trim().length < 10) {
      score -= 30
      issues.push("Question trop courte")
    }

    if (question.question.trim().length > 300) {
      score -= 10
      issues.push("Question trop longue")
    }

    // Vérification 2: Les options existent et sont valides
    if (question.type === "multiple_choice" || !question.type) {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        score -= 40
        issues.push("Options insuffisantes")
      } else {
        // Vérifier que les options ne sont pas vides
        const emptyOptions = question.options.filter(
          (opt: string) => !opt || opt.trim().length === 0
        )
        if (emptyOptions.length > 0) {
          score -= 20
          issues.push(`${emptyOptions.length} option(s) vide(s)`)
        }

        // Vérifier que les options sont différentes
        const uniqueOptions = new Set(
          question.options.map((opt: string) => opt.trim().toLowerCase())
        )
        if (uniqueOptions.size < question.options.length) {
          score -= 25
          issues.push("Options dupliquées")
        }

        // Vérifier que les options ont une longueur raisonnable
        const tooShortOptions = question.options.filter(
          (opt: string) => opt && opt.trim().length < 3
        )
        if (tooShortOptions.length > 0) {
          score -= 15
          issues.push("Options trop courtes")
        }
      }

      // Vérifier que la réponse correcte est valide
      if (
        question.correct === undefined ||
        question.correct === null ||
        (typeof question.correct === "number" &&
          (question.correct < 0 || question.correct >= question.options.length))
      ) {
        score -= 50
        issues.push("Réponse correcte invalide")
      }
    }

    // Vérification 3: L'explication existe et est détaillée
    if (!question.explanation || question.explanation.trim().length < 10) {
      score -= 20
      issues.push("Explication manquante ou trop courte")
    } else if (question.explanation.trim().length < 20) {
      score -= 10
      issues.push("Explication trop courte")
    }

    // Vérification 4: Cohérence question/réponse
    if (question.type === "multiple_choice" && question.options) {
      const correctAnswer = question.options[question.correct as number]
      if (correctAnswer) {
        // Vérifier que la réponse correcte semble plausible
        const plausibility = this.checkAnswerPlausibility(
          question.question,
          correctAnswer,
          subject
        )
        if (!plausibility.isPlausible) {
          score -= 15
          issues.push("Réponse correcte peu plausible")
        }
      }
    }

    // Vérification 5: Qualité du vocabulaire (basique)
    const vocabularyCheck = this.checkVocabularyQuality(
      question.question,
      subject
    )
    if (!vocabularyCheck.isAppropriate) {
      score -= 10
      issues.push("Vocabulaire inapproprié")
    }

    // Vérification 6: Langue française
    const languageCheck = this.checkFrenchLanguage(question.question)
    if (!languageCheck.isFrench) {
      score -= 15
      issues.push("Contenu pas entièrement en français")
    }

    return {
      score: Math.max(0, score),
      issue: issues.length > 0 ? issues.join(", ") : undefined
    }
  }

  /**
   * Vérifie la plausibilité d'une réponse
   */
  private checkAnswerPlausibility(
    question: string,
    answer: string,
    subject: string
  ): { isPlausible: boolean } {
    // Heuristiques basiques
    // Une réponse correcte ne devrait pas être "Aucune de ces réponses" ou similaire
    const suspiciousPatterns = [
      /aucune/i,
      /toutes/i,
      /je ne sais pas/i,
      /peut-être/i
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(answer) && answer.length < 50) {
        return { isPlausible: false }
      }
    }

    // Vérifier que la réponse n'est pas trop courte
    if (answer.trim().length < 3) {
      return { isPlausible: false }
    }

    return { isPlausible: true }
  }

  /**
   * Vérifie la qualité du vocabulaire
   */
  private checkVocabularyQuality(
    question: string,
    subject: string
  ): { isAppropriate: boolean } {
    // Vérifications basiques
    // Pas de mots inappropriés
    const inappropriateWords = ["merde", "con", "putain"] // Liste basique
    const lowerQuestion = question.toLowerCase()

    for (const word of inappropriateWords) {
      if (lowerQuestion.includes(word)) {
        return { isAppropriate: false }
      }
    }

    // Vérifier que la question n'est pas en majuscules (cri)
    if (question === question.toUpperCase() && question.length > 20) {
      return { isAppropriate: false }
    }

    return { isAppropriate: true }
  }

  /**
   * Vérifie que le contenu est en français
   */
  private checkFrenchLanguage(text: string): { isFrench: boolean } {
    // Mots-clés anglais communs à éviter
    const englishKeywords = [
      "the ", "is ", "are ", "and ", "or ", "what ", "when ", "where ",
      "how ", "why ", "which ", "who ", "this ", "that ", "these ", "those ",
      "answer", "question", "choose", "select", "click", "submit"
    ]

    const lowerText = text.toLowerCase()

    // Vérifier s'il y a trop de mots anglais
    let englishWordCount = 0
    for (const keyword of englishKeywords) {
      if (lowerText.includes(keyword)) {
        englishWordCount++
      }
    }

    // Si plus de 2 mots anglais, probablement pas en français
    if (englishWordCount > 2) {
      return { isFrench: false }
    }

    // Vérifier la présence de caractères français (accents)
    const hasFrenchChars = /[àâäéèêëïîôùûüÿç]/i.test(text)

    // Si pas d'accents mais texte long, peut-être pas français
    // Mais on ne pénalise pas trop car certains textes peuvent être sans accents
    if (!hasFrenchChars && text.length > 50) {
      // Vérifier si c'est vraiment de l'anglais
      const commonEnglishPatterns = /\b(the|is|are|and|or|what|when|where|how|why)\b/i
      if (commonEnglishPatterns.test(text)) {
        return { isFrench: false }
      }
    }

    return { isFrench: true }
  }

  /**
   * Vérifie la cohérence globale du quiz
   */
  private checkGlobalConsistency(quiz: GeneratedQuiz): {
    isConsistent: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Vérifier que toutes les réponses ne sont pas sur la même option
    if (quiz.questions.length > 0) {
      const answerDistribution: Record<number, number> = {}
      
      quiz.questions.forEach((q) => {
        if (typeof q.correct === "number") {
          answerDistribution[q.correct] = (answerDistribution[q.correct] || 0) + 1
        }
      })

      const maxSameAnswer = Math.max(...Object.values(answerDistribution), 0)
      if (maxSameAnswer > quiz.questions.length * 0.6) {
        errors.push(
          "Trop de réponses correctes sur la même option (possible biais)"
        )
      }
    }

    // Vérifier qu'il n'y a pas de questions en double
    const questionTexts = quiz.questions.map((q) =>
      q.question?.toLowerCase().trim()
    )
    const duplicates = questionTexts.filter(
      (text, index) => questionTexts.indexOf(text) !== index
    )
    if (duplicates.length > 0) {
      errors.push(`${duplicates.length} question(s) en double détectée(s)`)
    }

    // Vérifier que le nombre de questions est raisonnable
    if (quiz.questions.length < 3) {
      errors.push("Trop peu de questions (minimum 3 recommandé)")
    }

    if (quiz.questions.length > 15) {
      errors.push("Trop de questions (maximum 15 recommandé)")
    }

    return {
      isConsistent: errors.length === 0,
      errors
    }
  }

  /**
   * Vérification heuristique rapide (sans appel API)
   */
  heuristicVerification(quiz: GeneratedQuiz): FactualValidationResult {
    const questionScores: number[] = []
    const errors: string[] = []
    const warnings: string[] = []

    quiz.questions.forEach((question, index) => {
      let score = 100

      // Vérifications basiques
      if (!question.question || question.question.length < 10) {
        score -= 30
        errors.push(`Question ${index + 1}: Texte trop court`)
      }

      if (question.type === "multiple_choice" && question.options) {
        if (question.options.length < 2) {
          score -= 40
          errors.push(`Question ${index + 1}: Pas assez d'options`)
        }

        if (typeof question.correct === "number") {
          if (question.correct < 0 || question.correct >= question.options.length) {
            score -= 50
            errors.push(`Question ${index + 1}: Réponse correcte invalide`)
          }
        }
      }

      if (!question.explanation || question.explanation.length < 10) {
        score -= 20
        warnings.push(`Question ${index + 1}: Explication manquante ou courte`)
      }

      questionScores.push(Math.max(0, score))
    })

    const overall =
      questionScores.length > 0
        ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
        : 0

    return {
      overall: Math.round(overall),
      questionScores,
      errors,
      warnings,
      isValid: overall >= 70 && errors.length === 0
    }
  }
}


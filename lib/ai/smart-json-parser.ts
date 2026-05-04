/**
 * Smart JSON Parser
 * Parse et répare intelligemment les réponses JSON de l'IA
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

export interface GenerationParams {
  gradeLevel?: string
  difficulty?: string
  subject?: string
}

export class SmartJSONParser {
  /**
   * Parse une réponse de quiz avec plusieurs stratégies
   */
  parseQuizResponse(
    response: string,
    params: GenerationParams
  ): GeneratedQuiz | null {
    // Stratégie 1: Parsing direct
    let parsed = this.tryDirectParse(response)
    if (parsed && this.isValidQuiz(parsed)) {
      return parsed
    }

    // Stratégie 2: Nettoyage markdown
    parsed = this.tryCleanMarkdown(response)
    if (parsed && this.isValidQuiz(parsed)) {
      return parsed
    }

    // Stratégie 3: Extraction JSON partiel
    parsed = this.tryExtractPartialJSON(response)
    if (parsed && this.isValidQuiz(parsed)) {
      return parsed
    }

    // Stratégie 4: Réparation JSON
    parsed = this.tryRepairJSON(response)
    if (parsed && this.isValidQuiz(parsed)) {
      return parsed
    }

    // Stratégie 5: Extraction manuelle des champs
    parsed = this.tryManualExtraction(response, params)
    if (parsed && this.isValidQuiz(parsed)) {
      return parsed
    }

    console.error("Failed to parse quiz response after all strategies")
    return null
  }

  /**
   * Essai de parsing direct
   */
  private tryDirectParse(response: string): GeneratedQuiz | null {
    try {
      const parsed = JSON.parse(response.trim())
      return parsed as GeneratedQuiz
    } catch {
      return null
    }
  }

  /**
   * Nettoyage markdown et parsing
   */
  private tryCleanMarkdown(response: string): GeneratedQuiz | null {
    try {
      let cleaned = response
        // Enlever code blocks
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        // Enlever texte avant le premier {
        .replace(/^[^{]*/, "")
        // Enlever texte après le dernier }
        .replace(/[^}]*$/, "")
        .trim()

      // Si on a encore du texte, essayer d'extraire juste le JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }

      return this.tryDirectParse(cleaned)
    } catch {
      return null
    }
  }

  /**
   * Extraction JSON partiel
   */
  private tryExtractPartialJSON(response: string): GeneratedQuiz | null {
    try {
      // Chercher le JSON même s'il y a du texte autour
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return this.tryDirectParse(jsonMatch[0])
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Réparation JSON automatique
   */
  private tryRepairJSON(response: string): GeneratedQuiz | null {
    try {
      let repaired = response
        // Enlever markdown
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        // Réparer virgules en trop
        .replace(/,(\s*[}\]])/g, "$1")
        // Réparer clés sans guillemets (basique)
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // Réparer valeurs string sans guillemets (basique - attention aux faux positifs)
        .replace(/:\s*([^",\[\]{}0-9\s-]+)([,}\]])/g, ': "$1"$2')
        // Réparer apostrophes dans les strings
        .replace(/'/g, "\\'")
        .trim()

      // Extraire le JSON
      const jsonMatch = repaired.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        repaired = jsonMatch[0]
      }

      return this.tryDirectParse(repaired)
    } catch {
      return null
    }
  }

  /**
   * Extraction manuelle des champs (dernier recours)
   */
  private tryManualExtraction(
    response: string,
    params: GenerationParams
  ): GeneratedQuiz | null {
    try {
      // Extraire le titre
      const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/i) ||
                        response.match(/title["\s:]+([^\n,}]+)/i)
      const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Quiz"

      // Extraire la description
      const descMatch = response.match(/"description"\s*:\s*"([^"]+)"/i) ||
                       response.match(/description["\s:]+([^\n,}]+)/i)
      const description = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "") : ""

      // Extraire les questions (basique)
      const questionsMatch = response.match(/"questions"\s*:\s*\[([\s\S]*?)\]/i)
      const questions: any[] = []

      if (questionsMatch) {
        // Parser basique des questions
        const questionBlocks = questionsMatch[1].match(/\{[^}]*\}/g) || []
        questionBlocks.forEach(block => {
          const qMatch = block.match(/"question"\s*:\s*"([^"]+)"/i)
          const optionsMatch = block.match(/"options"\s*:\s*\[([^\]]+)\]/i)
          const correctMatch = block.match(/"correct"\s*:\s*(\d+|true|false)/i)

          if (qMatch) {
            const question = qMatch[1]
            let options: string[] = []
            let correct: number | boolean = 0

            if (optionsMatch) {
              options = optionsMatch[1]
                .split(",")
                .map(opt => opt.trim().replace(/^["']|["']$/g, ""))
            }

            if (correctMatch) {
              const correctVal = correctMatch[1]
              if (correctVal === "true") {
                correct = true
              } else if (correctVal === "false") {
                correct = false
              } else {
                correct = parseInt(correctVal, 10)
              }
            }

            questions.push({
              type: "multiple_choice",
              question,
              options: options.length > 0 ? options : ["Option 1", "Option 2", "Option 3", "Option 4"],
              correct,
              explanation: ""
            })
          }
        })
      }

      // Si pas de questions extraites, créer une structure minimale
      if (questions.length === 0) {
        questions.push({
          type: "multiple_choice",
          question: "Question extraite du texte",
          options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          correct: 0,
          explanation: ""
        })
      }

      return {
        title,
        description,
        subject: params.subject || "Général",
        difficulty: params.difficulty || "normal",
        grade_level: params.gradeLevel,
        questions,
        time_limit_minutes: 15,
        passing_score: 60,
        xp_reward: 50
      }
    } catch (error) {
      console.error("Error in manual extraction:", error)
      return null
    }
  }

  /**
   * Valide qu'un objet est un quiz valide
   */
  private isValidQuiz(quiz: any): quiz is GeneratedQuiz {
    if (!quiz || typeof quiz !== "object") {
      return false
    }

    // Vérifier les champs requis
    if (!quiz.title || typeof quiz.title !== "string") {
      return false
    }

    if (!quiz.subject || typeof quiz.subject !== "string") {
      return false
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return false
    }

    // Vérifier que chaque question a au moins un texte
    const hasValidQuestions = quiz.questions.every((q: any) => {
      return q && typeof q.question === "string" && q.question.length > 0
    })

    return hasValidQuestions
  }
}




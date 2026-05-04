/**
 * Route API de test pour la génération de quiz
 * GET /api/test/quiz-generation
 * Teste les nouveaux systèmes de génération
 */

import { NextResponse } from "next/server"
import { EnhancedQuizPrompts, type GenerationParams, type TeenContext } from "@/lib/ai/enhanced-quiz-prompts"
import { InterestIntegration } from "@/lib/ai/interest-integration"
import { SmartJSONParser } from "@/lib/ai/smart-json-parser"
import { FactualValidator } from "@/lib/ai/factual-validator"

export async function GET() {
  try {
    const results: Record<string, any> = {}

    // Test 1: Prompts enrichis
    console.log("🧪 Test 1: Prompts enrichis")
    const params: GenerationParams = {
      gradeLevel: "3ème",
      subject: "Mathématiques",
      difficulty: "normal",
      interests: ["Football", "Jeux vidéo"]
    }

    const teenContext: TeenContext = {
      averageScore: 65,
      completedQuizzes: 10,
      favoriteSubjects: ["Mathématiques"],
      weakSubjects: ["Histoire"]
    }

    const systemPrompt = EnhancedQuizPrompts.getSystemPrompt()
    const userPrompt = EnhancedQuizPrompts.buildUserPrompt(params, teenContext)

    const hasFrenchInstruction = systemPrompt.includes("FRANÇAIS") || systemPrompt.includes("français")
    const hasMoroccanContext = systemPrompt.includes("marocain") || systemPrompt.includes("Maroc")
    const hasInterests = userPrompt.includes("Football") || userPrompt.includes("Jeux vidéo")

    results.test1_prompts = {
      success: hasFrenchInstruction && hasMoroccanContext && hasInterests,
      hasFrenchInstruction,
      hasMoroccanContext,
      hasInterests,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 200) + "...",
      userPromptPreview: userPrompt.substring(0, 300) + "..."
    }

    // Test 2: Intégration des intérêts
    console.log("🧪 Test 2: Intégration des intérêts")
    const enhancedParams = InterestIntegration.integrateInterests(
      params,
      params.interests || []
    )

    const suggestedSubjects = InterestIntegration.suggestSubjects(["Football", "K-Pop"])

    results.test2_interests = {
      success: !!enhancedParams.customPrompt && !!enhancedParams.subject,
      hasCustomPrompt: !!enhancedParams.customPrompt,
      hasSubject: !!enhancedParams.subject,
      suggestedSubjects,
      customPromptPreview: enhancedParams.customPrompt?.substring(0, 200) + "..."
    }

    // Test 3: Parser JSON
    console.log("🧪 Test 3: Parser JSON")
    const parser = new SmartJSONParser()

    const validJSON = `{
      "title": "Quiz de Mathématiques",
      "description": "Test de quiz en français",
      "subject": "Mathématiques",
      "difficulty": "normal",
      "grade_level": "3ème",
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Quelle est la solution de 2x + 5 = 13 ?",
          "options": ["x = 4", "x = 5", "x = 6", "x = 7"],
          "correct": 0,
          "explanation": "On soustrait 5: 2x = 8, puis on divise par 2: x = 4"
        }
      ],
      "time_limit_minutes": 15,
      "passing_score": 60,
      "xp_reward": 50
    }`

    const parsed1 = parser.parseQuizResponse(validJSON, {
      gradeLevel: "3ème",
      difficulty: "normal",
      subject: "Mathématiques"
    })

    const jsonWithMarkdown = `\`\`\`json
${validJSON}
\`\`\``

    const parsed2 = parser.parseQuizResponse(jsonWithMarkdown, {
      gradeLevel: "3ème",
      difficulty: "normal",
      subject: "Mathématiques"
    })

    results.test3_parser = {
      success: parsed1 !== null && parsed2 !== null,
      validJSONParsed: parsed1 !== null,
      markdownJSONParsed: parsed2 !== null,
      parsedTitle: parsed1?.title,
      parsedQuestionsCount: parsed1?.questions.length
    }

    // Test 4: Validation factuelle
    console.log("🧪 Test 4: Validation factuelle")
    const validator = new FactualValidator()

    const validQuiz = {
      title: "Quiz de Mathématiques - Niveau 3ème",
      description: "Quiz sur les équations et la géométrie, adapté au programme marocain",
      subject: "Mathématiques",
      difficulty: "normal",
      grade_level: "3ème",
      questions: [
        {
          type: "multiple_choice",
          question: "Quelle est la solution de l'équation 2x + 5 = 13 ?",
          options: ["x = 4", "x = 5", "x = 6", "x = 7"],
          correct: 0,
          explanation: "Pour résoudre 2x + 5 = 13, on soustrait 5 des deux côtés: 2x = 8, puis on divise par 2: x = 4."
        },
        {
          type: "true_false",
          question: "Un triangle rectangle a toujours un angle de 90 degrés.",
          correct: true,
          explanation: "Par définition, un triangle rectangle possède exactement un angle droit (90 degrés)."
        }
      ],
      time_limit_minutes: 15,
      passing_score: 60,
      xp_reward: 50
    }

    const validation = validator.heuristicVerification(validQuiz)

    results.test4_validation = {
      success: validation.isValid,
      score: validation.overall,
      isValid: validation.isValid,
      errorsCount: validation.errors.length,
      warningsCount: validation.warnings.length,
      errors: validation.errors,
      warnings: validation.warnings
    }

    // Test 5: Vérification langue française
    console.log("🧪 Test 5: Vérification langue française")
    const frenchText = "Quelle est la solution de l'équation 2x + 5 = 13 ?"
    const englishText = "What is the solution of the equation 2x + 5 = 13?"
    
    const frenchCheck = (validator as any).checkFrenchLanguage(frenchText)
    const englishCheck = (validator as any).checkFrenchLanguage(englishText)

    results.test5_french = {
      success: frenchCheck.isFrench && !englishCheck.isFrench,
      frenchTextDetected: frenchCheck.isFrench,
      englishTextDetected: !englishCheck.isFrench,
      frenchExample: frenchText,
      englishExample: englishText
    }

    // Résumé
    const totalTests = 5
    const passedTests = [
      results.test1_prompts.success,
      results.test2_interests.success,
      results.test3_parser.success,
      results.test4_validation.success,
      results.test5_french.success
    ].filter(Boolean).length

    results.summary = {
      totalTests,
      passedTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
      allPassed: passedTests === totalTests
    }

    return NextResponse.json({
      success: true,
      message: "Tests de génération de quiz terminés",
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Erreur lors des tests:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}




/**
 * Route API pour générer un quiz avec les nouveaux systèmes
 * POST /api/test/generate-quiz
 */

import { NextResponse } from "next/server"
import { ContentGenerator, type GenerationParams } from "@/lib/ai/content-generator"

type QuizQuestion = {
  type?: string
  question: string
  options?: string[]
  correct: number | boolean | number[]
  explanation?: string
}

const normalizeQuestion = (q: QuizQuestion): QuizQuestion => {
  let options: string[] = []
  const candidate = q.options

  if (Array.isArray(candidate)) {
    options = candidate.map((item) => String(item)).filter((item) => item.trim().length > 0)
  } else if (candidate && typeof candidate === "object") {
    options = Object.values(candidate)
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0)
  } else if (typeof candidate === "string") {
    const parts = candidate
      .split(/\r?\n|;|\||\s+\d+\.\s+|\s+[A-D]\)\s+/g)
      .map((item) => item.replace(/^[A-D]\)\s*/i, "").trim())
      .filter((item) => item.length > 0)
    if (parts.length >= 2) {
      options = parts
    }
  }
  let correct = q.correct

  const isTrueFalse = q.type === "true_false" || typeof correct === "boolean"
  if (isTrueFalse && options.length === 0) {
    options = ["Vrai", "Faux"]
    if (typeof correct === "boolean") {
      correct = correct ? 0 : 1
    }
  }

  return {
    ...q,
    options,
    correct,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      gradeLevel,
      subject,
      difficulty,
      interests,
    } = body

    // Créer les paramètres de génération
    const params: GenerationParams = {
      contentType: "quiz",
      gradeLevel,
      subject,
      difficulty: difficulty || "normal",
      interests: interests ? (Array.isArray(interests) ? interests : interests.split(",").map((i: string) => i.trim())) : [],
    }

    // Initialiser le générateur
    // Vérifier quelle clé API est disponible
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    
    let provider: "openai" | "claude" = "openai"
    if (process.env.AI_PROVIDER === "claude" && hasAnthropic) {
      provider = "claude"
    } else if (!hasOpenAI && hasAnthropic) {
      provider = "claude"
    } else if (!hasOpenAI && !hasAnthropic) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune clé API configurée. Veuillez configurer OPENAI_API_KEY ou ANTHROPIC_API_KEY dans vos variables d'environnement.",
        },
        { status: 500 }
      )
    }
    
    const generator = new ContentGenerator(provider, true)

    // Générer le quiz
    const quiz = await generator.generateQuiz(params)

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de générer le quiz. Vérifiez que les clés API sont configurées.",
        },
        { status: 500 }
      )
    }

    const normalizedQuiz = {
      ...quiz,
      questions: quiz.questions.map(normalizeQuestion),
    }

    return NextResponse.json({
      success: true,
      quiz: normalizedQuiz,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    )
  }
}



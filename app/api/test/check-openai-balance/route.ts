/**
 * Route API pour vérifier le solde OpenAI
 * GET /api/test/check-openai-balance
 */

import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: "OPENAI_API_KEY non configurée",
    }, { status: 400 })
  }

  try {
    // OpenAI n'a pas d'API directe pour vérifier le solde
    // On fait un test d'appel avec un modèle simple pour vérifier que la clé fonctionne
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Erreur inconnue" } }))
      return NextResponse.json({
        success: false,
        error: error.error?.message || `Erreur HTTP ${response.status}`,
        status: response.status,
      }, { status: response.status })
    }

    // Test avec un petit appel pour vérifier les crédits
    const testResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Test" },
        ],
        max_tokens: 5,
      }),
    })

    if (!testResponse.ok) {
      const error = await testResponse.json().catch(() => ({ error: { message: "Erreur inconnue" } }))
      
      // Erreurs communes liées au solde
      if (error.error?.code === "insufficient_quota" || error.error?.message?.includes("quota")) {
        return NextResponse.json({
          success: false,
          error: "Solde insuffisant ou quota dépassé",
          details: error.error?.message,
        }, { status: 402 })
      }

      if (error.error?.code === "invalid_api_key") {
        return NextResponse.json({
          success: false,
          error: "Clé API invalide",
          details: error.error?.message,
        }, { status: 401 })
      }

      return NextResponse.json({
        success: false,
        error: error.error?.message || `Erreur HTTP ${testResponse.status}`,
        details: error,
      }, { status: testResponse.status })
    }

    const testData = await testResponse.json()
    const tokensUsed = testData.usage?.total_tokens || 0

    return NextResponse.json({
      success: true,
      message: "Clé API OpenAI valide et fonctionnelle",
      test: {
        tokensUsed,
        model: testData.model,
      },
      note: "OpenAI ne fournit pas d'API directe pour vérifier le solde. Consultez votre dashboard OpenAI pour voir votre solde.",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }, { status: 500 })
  }
}


/**
 * Route API pour vérifier la configuration des clés API
 * GET /api/test/check-api-keys
 */

import { NextResponse } from "next/server"

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
  const hasOpenAI = !!openaiKey
  const hasAnthropic = !!anthropicKey
  const provider = process.env.AI_PROVIDER || "openai"

  // Masquer les clés pour la sécurité (afficher seulement les 10 premiers caractères)
  const openaiKeyPreview = openaiKey 
    ? `${openaiKey.substring(0, 10)}...` 
    : null
  const anthropicKeyPreview = anthropicKey 
    ? `${anthropicKey.substring(0, 15)}...` 
    : null

  return NextResponse.json({
    success: true,
    config: {
      hasOpenAI,
      hasAnthropic,
      provider,
      openaiKeyPreview,
      anthropicKeyPreview,
      recommendedProvider: hasAnthropic ? "claude" : hasOpenAI ? "openai" : null,
    },
    message: hasOpenAI || hasAnthropic 
      ? "Clé(s) API configurée(s)" 
      : "Aucune clé API configurée",
  })
}



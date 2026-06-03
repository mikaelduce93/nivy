import "server-only"

import Anthropic from "@anthropic-ai/sdk"

// #210 — Singleton SDK Anthropic. Évite de reconstruire un client par appel
// (réutilise le pool de connexions). La clé reste lue depuis l'env à chaud.
let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }
  if (!client) {
    client = new Anthropic({ apiKey })
  }
  return client
}

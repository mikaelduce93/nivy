import { BaseAIProvider, type AIProviderResponse } from "./base"

// Last-resort fallback if neither a constructor-passed model nor the
// CLAUDE_MODEL_ID env var is set. Kept in sync with the canonical default
// in `lib/ai/content-generator.ts`.
const CLAUDE_FALLBACK_MODEL = "claude-sonnet-4-6"

export class ClaudeProvider extends BaseAIProvider {
  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const startTime = Date.now()
    const model = this.model || process.env.CLAUDE_MODEL_ID || CLAUDE_FALLBACK_MODEL
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      let errorMessage = "Unknown error"
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || JSON.stringify(error)
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(`Claude API error: ${errorMessage}`)
    }

    const data = await response.json()
    const generationTime = Date.now() - startTime

    return {
      content: data.content[0]?.text || "",
      metadata: {
        provider: "claude",
        model,
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        generationTime,
      },
    }
  }
}

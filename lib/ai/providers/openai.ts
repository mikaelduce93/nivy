import { BaseAIProvider, type AIProviderResponse } from "./base"

// Last-resort fallback if neither a constructor-passed model nor the
// OPENAI_MODEL_ID env var is set. Kept in sync with the canonical default
// in `lib/ai/content-generator.ts`.
const OPENAI_FALLBACK_MODEL = "gpt-4o-mini"

export class OpenAIProvider extends BaseAIProvider {
  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    const startTime = Date.now()
    const model = this.model || process.env.OPENAI_MODEL_ID || OPENAI_FALLBACK_MODEL
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
    }

    const data = await response.json()
    const generationTime = Date.now() - startTime

    return {
      content: data.choices[0]?.message?.content || "",
      metadata: {
        provider: "openai",
        model,
        tokensUsed: data.usage?.total_tokens || 0,
        generationTime,
      },
    }
  }
}

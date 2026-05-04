import { BaseAIProvider, type AIProviderResponse } from "./base"

export class ClaudeProvider extends BaseAIProvider {
  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const startTime = Date.now()
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model || "claude-3-sonnet-20240229",
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
        model: this.model,
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        generationTime,
      },
    }
  }
}

import { BaseAIProvider, type AIProviderResponse } from "./base"

export class OpenAIProvider extends BaseAIProvider {
  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    const startTime = Date.now()
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model || "gpt-4",
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
        model: this.model,
        tokensUsed: data.usage?.total_tokens || 0,
        generationTime,
      },
    }
  }
}

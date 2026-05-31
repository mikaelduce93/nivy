import Anthropic from "@anthropic-ai/sdk"
import { BaseAIProvider, type AIProviderResponse } from "./base"

// #210 — provider Claude via le SDK officiel (@anthropic-ai/sdk), remplace le
// fetch artisanal figé sur `anthropic-version: 2023-06-01`. Modèle env-driven
// (constructeur > CLAUDE_MODEL_ID > fallback). Prompt caching activé sur le
// bloc system (stable) pour ~90% d'économie dès le 2e tour d'une conversation.
const CLAUDE_FALLBACK_MODEL = "claude-sonnet-4-6"

export class ClaudeProvider extends BaseAIProvider {
  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const startTime = Date.now()
    const model = this.model || process.env.CLAUDE_MODEL_ID || CLAUDE_FALLBACK_MODEL
    const client = new Anthropic({ apiKey: this.apiKey })

    const message = await client.messages.create({
      model,
      max_tokens: 2000,
      // Le system (sécurité + contexte profil/mémoire) est stable → cache_control
      // ephemeral. `messages` (volatil) reste hors cache.
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    })

    const generationTime = Date.now() - startTime
    const content = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")

    const usage = message.usage
    return {
      content,
      metadata: {
        provider: "claude",
        model,
        tokensUsed: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
        generationTime,
      },
    }
  }
}

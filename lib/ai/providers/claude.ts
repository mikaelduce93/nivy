import Anthropic from "@anthropic-ai/sdk"

import { getAnthropic } from "../anthropic"
import {
  BaseAIProvider,
  type AIProviderMetadata,
  type AIProviderResponse,
  type AIToolDef,
  type AIToolResult,
  type RunToolsAIProvider,
  type StreamingAIProvider,
  type ToolRunResult,
} from "./base"

// #210 — provider Claude via le SDK officiel (@anthropic-ai/sdk), remplace le
// fetch artisanal figé sur `anthropic-version: 2023-06-01`. Modèle env-driven
// (constructeur > CLAUDE_MODEL_ID > fallback). Prompt caching activé sur le
// bloc system (stable) pour ~90% d'économie dès le 2e tour d'une conversation.
const CLAUDE_FALLBACK_MODEL = "claude-sonnet-4-6"
const MAX_TOKENS = 2000

type ClaudeUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

export class ClaudeProvider extends BaseAIProvider implements StreamingAIProvider, RunToolsAIProvider {
  private resolveModel(): string {
    return this.model || process.env.CLAUDE_MODEL_ID || CLAUDE_FALLBACK_MODEL
  }

  private buildMetadata(
    model: string,
    generationTime: number,
    usage: ClaudeUsage | null | undefined,
  ): AIProviderMetadata {
    return {
      provider: "claude",
      model,
      tokensUsed: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      generationTime,
      cacheReadInputTokens: usage?.cache_read_input_tokens ?? undefined,
      cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? undefined,
    }
  }

  async call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const startTime = Date.now()
    const model = this.resolveModel()
    const client = getAnthropic()

    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      // Le system (sécurité + contexte profil/mémoire) est stable → cache_control
      // ephemeral. `messages` (volatil) reste hors cache.
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    })

    const content = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")

    return {
      content,
      metadata: this.buildMetadata(model, Date.now() - startTime, message.usage),
    }
  }

  // #210 — streaming token-par-token. `onDelta` reçoit chaque fragment ; `signal`
  // permet de couper net (post-filtre sécurité / dépassement de longueur).
  async callStream(
    systemPrompt: string,
    userPrompt: string,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const startTime = Date.now()
    const model = this.resolveModel()
    const client = getAnthropic()

    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal },
    )

    let content = ""
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        content += event.delta.text
        onDelta(event.delta.text)
      }
    }

    const final = await stream.finalMessage()
    return {
      content,
      metadata: this.buildMetadata(model, Date.now() - startTime, final.usage),
    }
  }

  // #212 — boucle d'outils fermée (closed tool loop). Bornée par `maxSteps` →
  // corrige par construction l'absence de limite de pas. Renvoie le texte final
  // + les résultats des tools (jamais de faux succès : ils viennent des executors).
  async runTools(
    systemPrompt: string,
    userPrompt: string,
    tools: AIToolDef[],
    execute: (name: string, input: Record<string, unknown>) => Promise<AIToolResult>,
    maxSteps = 4,
  ): Promise<ToolRunResult> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }
    const startTime = Date.now()
    const model = this.resolveModel()
    const client = getAnthropic()

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }]
    const actions: ToolRunResult["actions"] = []
    let finalText = ""
    let usage: ClaudeUsage | null | undefined

    for (let step = 0; step < maxSteps; step++) {
      const resp = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        tools: tools as Anthropic.Tool[],
        messages,
      })
      usage = resp.usage

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
      if (text) finalText = text

      if (resp.stop_reason !== "tool_use") break

      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      )
      if (toolUses.length === 0) break

      messages.push({ role: "assistant", content: resp.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const result = await execute(tu.name, (tu.input ?? {}) as Record<string, unknown>)
        actions.push({ name: tu.name, result })
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        })
      }
      messages.push({ role: "user", content: toolResults })
    }

    return {
      content: finalText,
      actions,
      metadata: this.buildMetadata(model, Date.now() - startTime, usage),
    }
  }
}

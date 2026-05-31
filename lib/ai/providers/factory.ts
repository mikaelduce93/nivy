import { OpenAIProvider } from "./openai"
import { ClaudeProvider } from "./claude"
import type { BaseAIProvider } from "./base"

export type AIProviderType = "openai" | "claude" | "manual"

export class AIProviderFactory {
  static getProvider(type: AIProviderType, model?: string): BaseAIProvider {
    switch (type) {
      case "openai":
        return new OpenAIProvider(
          process.env.OPENAI_API_KEY || null,
          // #210 — défaut env-driven (plus de gpt-4 obsolète/coûteux en dur).
          model || process.env.OPENAI_MODEL_ID || "gpt-4o-mini"
        )
      case "claude":
        return new ClaudeProvider(
          process.env.ANTHROPIC_API_KEY || null,
          // #210 — défaut moderne env-driven (plus de claude-3-sonnet-20240229).
          model || process.env.CLAUDE_MODEL_ID || "claude-sonnet-4-6"
        )
      default:
        throw new Error(`Unsupported AI provider: ${type}`)
    }
  }
}

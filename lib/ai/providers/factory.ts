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
          model || "gpt-4"
        )
      case "claude":
        return new ClaudeProvider(
          process.env.ANTHROPIC_API_KEY || null,
          model || "claude-3-sonnet-20240229"
        )
      default:
        throw new Error(`Unsupported AI provider: ${type}`)
    }
  }
}

export interface AIProviderMetadata {
  provider: string
  model: string
  tokensUsed: number
  generationTime: number
}

export interface AIProviderResponse {
  content: string
  metadata: AIProviderMetadata
}

export abstract class BaseAIProvider {
  protected apiKey: string | null = null
  protected model: string = ""

  constructor(apiKey: string | null, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  abstract call(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse>
}

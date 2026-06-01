export interface AIProviderMetadata {
  provider: string
  model: string
  tokensUsed: number
  generationTime: number
  // #210 — prompt caching : permet de vérifier `cache_read_input_tokens > 0`.
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
}

export interface AIProviderResponse {
  content: string
  metadata: AIProviderMetadata
}

// #210 — providers supportant le streaming token-par-token. `onDelta` reçoit
// chaque fragment de texte ; `signal` permet de couper net (garde-fou sécurité).
export interface StreamingAIProvider {
  callStream(
    systemPrompt: string,
    userPrompt: string,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<AIProviderResponse>
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

// #210 — garde de type pour router vers le streaming quand le provider le gère.
export function supportsStreaming(
  provider: BaseAIProvider,
): provider is BaseAIProvider & StreamingAIProvider {
  return typeof (provider as Partial<StreamingAIProvider>).callStream === "function"
}

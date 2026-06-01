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

// #212 — boucle d'outils agentiques (closed tool loop). `input_schema` est un
// JSON Schema au format Anthropic. L'executor renvoie un résultat HONNÊTE
// (jamais de faux succès) ; `pendingApproval` = action gatée (confirmation parent).
export interface AIToolDef {
  name: string
  description: string
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] }
}

export interface AIToolResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  pendingApproval?: boolean
}

export interface ToolRunResult {
  content: string
  actions: Array<{ name: string; result: AIToolResult }>
  metadata: AIProviderMetadata
}

export interface RunToolsAIProvider {
  runTools(
    systemPrompt: string,
    userPrompt: string,
    tools: AIToolDef[],
    execute: (name: string, input: Record<string, unknown>) => Promise<AIToolResult>,
    maxSteps?: number,
  ): Promise<ToolRunResult>
}

export function supportsRunTools(
  provider: BaseAIProvider,
): provider is BaseAIProvider & RunToolsAIProvider {
  return typeof (provider as Partial<RunToolsAIProvider>).runTools === "function"
}

// #212 — sortie JSON STRUCTURÉE garantie conforme (DoD-5 : « zéro fallback regex »).
// `schema` est un JSON Schema (format objet). L'implémentation force le modèle à
// remplir ce schéma (tool-forced JSON côté Claude) et renvoie l'objet typé : pas
// de parsing/réparation regex. `null` = réponse modèle vide/malformée (l'appelant
// retombe alors sur son fallback curaté statique, pas sur du regex).
export interface StructuredSchema {
  name: string
  description?: string
  schema: { type: "object"; properties: Record<string, unknown>; required?: string[] }
}

export interface StructuredAIProvider {
  callStructured<T = Record<string, unknown>>(
    systemPrompt: string,
    userPrompt: string,
    spec: StructuredSchema,
  ): Promise<{ data: T | null; metadata: AIProviderMetadata }>
}

export function supportsStructured(
  provider: BaseAIProvider,
): provider is BaseAIProvider & StructuredAIProvider {
  return typeof (provider as Partial<StructuredAIProvider>).callStructured === "function"
}

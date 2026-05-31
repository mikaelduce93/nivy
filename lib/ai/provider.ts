import { createOpenAI } from '@ai-sdk/openai';

// We can support multiple providers here (Anthropic, Mistral, etc.)
// For now, we standardize on OpenAI.

// `compatibility: 'strict'` was removed from OpenAIProviderSettings in
// recent ai-sdk releases. The default behaviour matches what `'strict'`
// used to enforce, so the option is no longer needed.
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// #202 — modèle env-driven (plus de hardcode). Aligne /api/agent/action sur le
// routing par variable d'env déjà utilisé ailleurs (content-generator).
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

// Helper to get the default model
export const getDefaultModel = () => {
  return openai(process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL);
};

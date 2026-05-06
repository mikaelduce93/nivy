import { createOpenAI } from '@ai-sdk/openai';

// We can support multiple providers here (Anthropic, Mistral, etc.)
// For now, we standardize on OpenAI.

// `compatibility: 'strict'` was removed from OpenAIProviderSettings in
// recent ai-sdk releases. The default behaviour matches what `'strict'`
// used to enforce, so the option is no longer needed.
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to get the default model
export const getDefaultModel = () => {
  return openai('gpt-4o-mini'); // Cost-effective, fast, smart enough for agents
};

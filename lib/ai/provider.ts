import { createOpenAI } from '@ai-sdk/openai';

// We can support multiple providers here (Anthropic, Mistral, etc.)
// For now, we standardize on OpenAI.

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict', // Strict mode for structured output
});

// Helper to get the default model
export const getDefaultModel = () => {
  return openai('gpt-4o-mini'); // Cost-effective, fast, smart enough for agents
};

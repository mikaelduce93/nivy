"use client"

import { useChat as useChatRaw } from "@ai-sdk/react"

/**
 * Single typed surface for the Vercel AI SDK useChat hook.
 *
 * The components/ai/* surface still relies on the legacy v3 shape
 * (input/setInput/handleSubmit/isLoading + message.content/role/toolInvocations).
 * This wrapper centralises the cast so the migration to ai-sdk v5
 * (messages/sendMessage/status) only has to be made in one place.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChatMessage = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChatToolInvocation = any

export interface UseAIChatOptions {
  api: string
  body?: Record<string, unknown>
  initialMessages?: ChatMessage[]
  onFinish?: (message: ChatMessage) => void
  onError?: (error: Error) => void
}

export interface UseAIChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  handleSubmit: (event?: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error?: Error
  reload?: () => void
  stop?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useChat = useChatRaw as unknown as (opts: UseAIChatOptions) => any

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const chat = useChat(options)

  return {
    messages: chat.messages ?? [],
    input: typeof chat.input === "string" ? chat.input : "",
    setInput: chat.setInput ?? (() => undefined),
    handleSubmit: chat.handleSubmit ?? (() => undefined),
    isLoading: Boolean(chat.isLoading ?? chat.status === "streaming"),
    error: chat.error,
    reload: chat.reload,
    stop: chat.stop,
  }
}

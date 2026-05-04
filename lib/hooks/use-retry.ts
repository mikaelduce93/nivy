'use client'

/**
 * TEENS PARTY MOROCCO - useRetry Hook
 * ===================================
 *
 * Hook pour gérer la logique de retry avec backoff exponentiel
 * et gestion d'erreurs uniformisée.
 */

import * as React from 'react'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Initial delay in ms before first retry */
  initialDelay?: number
  /** Maximum delay in ms between retries */
  maxDelay?: number
  /** Backoff multiplier (exponential) */
  backoffMultiplier?: number
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: unknown) => void
  /** Callback on final failure */
  onFinalFailure?: (error: unknown, attempts: number) => void
}

interface RetryState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
}

interface RetryActions {
  retry: () => Promise<void>
  reset: () => void
}

/* ==========================================================================
   DEFAULT OPTIONS
   ========================================================================== */

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  isRetryable: () => true,
  onRetry: () => {},
  onFinalFailure: () => {},
}

/* ==========================================================================
   UTILITY: Calculate delay with exponential backoff
   ========================================================================== */

function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1)
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay
  return Math.min(delay + jitter, maxDelay)
}

/* ==========================================================================
   UTILITY: Sleep function
   ========================================================================== */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ==========================================================================
   HOOK: useRetry
   ========================================================================== */

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {}
): [RetryState<T>, RetryActions] {
  const opts = { ...defaultOptions, ...options }

  const [state, setState] = React.useState<RetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
    canRetry: true,
  })

  const mountedRef = React.useRef(true)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Cleanup on unmount
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const execute = React.useCallback(
    async (isRetry = false) => {
      // Cancel any ongoing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isRetrying: isRetry,
        error: isRetry ? prev.error : null,
      }))

      let attempt = isRetry ? state.retryCount + 1 : 1
      let lastError: Error | null = null

      while (attempt <= opts.maxRetries + 1) {
        try {
          const result = await asyncFn()

          if (mountedRef.current) {
            setState({
              data: result,
              error: null,
              isLoading: false,
              isRetrying: false,
              retryCount: 0,
              canRetry: true,
            })
          }
          return
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // Check if we should retry
          const shouldRetry =
            attempt <= opts.maxRetries && opts.isRetryable(error)

          if (shouldRetry) {
            opts.onRetry(attempt, error)

            // Calculate delay and wait
            const delay = calculateDelay(
              attempt,
              opts.initialDelay,
              opts.maxDelay,
              opts.backoffMultiplier
            )

            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                retryCount: attempt,
                isRetrying: true,
              }))
            }

            await sleep(delay)
            attempt++
          } else {
            break
          }
        }
      }

      // Final failure
      if (mountedRef.current) {
        opts.onFinalFailure(lastError, attempt - 1)
        setState({
          data: null,
          error: lastError,
          isLoading: false,
          isRetrying: false,
          retryCount: attempt - 1,
          canRetry: attempt <= opts.maxRetries,
        })
      }
    },
    [asyncFn, opts, state.retryCount]
  )

  const retry = React.useCallback(async () => {
    await execute(true)
  }, [execute])

  const reset = React.useCallback(() => {
    abortControllerRef.current?.abort()
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      canRetry: true,
    })
  }, [])

  return [state, { retry, reset }]
}

/* ==========================================================================
   HOOK: useRetryFetch - Specialized for fetch requests
   ========================================================================== */

interface FetchRetryOptions extends RetryOptions {
  /** Fetch options */
  fetchOptions?: RequestInit
}

export function useRetryFetch<T>(
  url: string,
  options: FetchRetryOptions = {}
): [RetryState<T>, RetryActions & { refetch: () => Promise<void> }] {
  const { fetchOptions, ...retryOptions } = options

  const asyncFn = React.useCallback(async () => {
    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
      ;(error as any).status = response.status
      throw error
    }

    return response.json() as Promise<T>
  }, [url, fetchOptions])

  const [state, actions] = useRetry<T>(asyncFn, {
    ...retryOptions,
    isRetryable: (error) => {
      // Retry on network errors and 5xx errors
      if (error instanceof Error) {
        const status = (error as any).status
        if (status) {
          return status >= 500 && status < 600
        }
        return true // Network error
      }
      return false
    },
  })

  const refetch = React.useCallback(async () => {
    actions.reset()
    await actions.retry()
  }, [actions])

  return [state, { ...actions, refetch }]
}

/* ==========================================================================
   HOOK: useAutoRetry - Automatically retries on mount
   ========================================================================== */

export function useAutoRetry<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions & { enabled?: boolean } = {}
): RetryState<T> & RetryActions {
  const { enabled = true, ...retryOptions } = options
  const [state, actions] = useRetry<T>(asyncFn, retryOptions)
  const hasRunRef = React.useRef(false)

  React.useEffect(() => {
    if (enabled && !hasRunRef.current) {
      hasRunRef.current = true
      actions.retry()
    }
  }, [enabled, actions])

  // Reset hasRunRef when asyncFn changes
  React.useEffect(() => {
    hasRunRef.current = false
  }, [asyncFn])

  return { ...state, ...actions }
}

/* ==========================================================================
   UTILITY: retryAsync - One-off retry function
   ========================================================================== */

export async function retryAsync<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let attempt = 1
  let lastError: Error | null = null

  while (attempt <= opts.maxRetries + 1) {
    try {
      return await asyncFn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      const shouldRetry =
        attempt <= opts.maxRetries && opts.isRetryable(error)

      if (shouldRetry) {
        opts.onRetry(attempt, error)
        const delay = calculateDelay(
          attempt,
          opts.initialDelay,
          opts.maxDelay,
          opts.backoffMultiplier
        )
        await sleep(delay)
        attempt++
      } else {
        break
      }
    }
  }

  opts.onFinalFailure(lastError, attempt - 1)
  throw lastError
}

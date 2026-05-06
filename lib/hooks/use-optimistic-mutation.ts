'use client'

/* ==========================================================================
   useOptimisticMutation — React Query wrapper with automatic rollback.

   Pattern:
     1. onMutate fires synchronously => UI gets the optimistic update
        (e.g. +50 XP visually) and returns a `context` with rollback data.
     2. The real mutationFn runs in the background.
     3. On error, the context is passed back to `onError` so the consumer
        can roll back the local state and surface a toast.
     4. On success, optional `onSuccess` reconciles the optimistic value
        with the server's authoritative response.

   Designed to feel like a thin layer on top of @tanstack/react-query
   useMutation — no global state, no surprises.
   ========================================================================== */

import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'

export interface OptimisticMutationOptions<TInput, TOutput, TContext> {
  /** Synchronous (or async) optimistic update. Return value is passed to onError/onSuccess. */
  onMutate: (input: TInput) => TContext | Promise<TContext>
  /** Rollback hook — fired only when the mutation rejects. */
  onError?: (error: Error, input: TInput, context: TContext | undefined) => void
  /** Reconciliation — fired only when the mutation resolves. */
  onSuccess?: (output: TOutput, input: TInput, context: TContext | undefined) => void
  /** Always fires (success or error) — useful for cleanup (loading flags, etc.). */
  onSettled?: (output: TOutput | undefined, error: Error | null, input: TInput, context: TContext | undefined) => void
  /** Forwarded to React Query (e.g. mutationKey, retry). */
  mutationKey?: UseMutationOptions<TOutput, Error, TInput, TContext>['mutationKey']
  /** Number of retries on transient failure. Default: 0 (we already optimistic-updated). */
  retry?: number
}

/**
 * Wrap a mutation function with optimistic UI updates and automatic rollback.
 *
 * @example
 * ```ts
 * const addXp = useOptimisticMutation<{ amount: number }, { newTotal: number }, { previous: number }>(
 *   async ({ amount }) => fetch('/api/xp', { method: 'POST', body: JSON.stringify({ amount }) }).then(r => r.json()),
 *   {
 *     onMutate: ({ amount }) => {
 *       const previous = currentXp
 *       setCurrentXp(currentXp + amount) // optimistic
 *       return { previous }
 *     },
 *     onError: (_err, _input, ctx) => {
 *       if (ctx) setCurrentXp(ctx.previous) // rollback
 *       toast.error('XP non sauvegardé, réessaie.')
 *     },
 *     onSuccess: (output) => {
 *       setCurrentXp(output.newTotal) // reconcile with server
 *     },
 *   },
 * )
 *
 * addXp.mutate({ amount: 50 })
 * ```
 */
export function useOptimisticMutation<TInput, TOutput, TContext = unknown>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options: OptimisticMutationOptions<TInput, TOutput, TContext>
): UseMutationResult<TOutput, Error, TInput, TContext> {
  return useMutation<TOutput, Error, TInput, TContext>({
    mutationFn,
    mutationKey: options.mutationKey,
    retry: options.retry ?? 0,
    onMutate: async (input) => {
      // The return value becomes `context` in onError / onSuccess / onSettled.
      const ctx = await options.onMutate(input)
      return ctx
    },
    onError: (error, input, context) => {
      options.onError?.(error, input, context)
    },
    onSuccess: (output, input, context) => {
      options.onSuccess?.(output, input, context)
    },
    onSettled: (output, error, input, context) => {
      options.onSettled?.(output, error, input, context)
    },
  })
}

/* --------------------------------------------------------------------------
   Light variant — no React Query dependency.

   Useful for hot paths where we just want fire-and-rollback semantics
   inside a component without registering a mutation in the QueryClient.
   -------------------------------------------------------------------------- */

export interface OptimisticRunner<TInput, TOutput> {
  isPending: boolean
  mutate: (input: TInput) => Promise<TOutput | null>
}

import { useCallback, useRef, useState } from 'react'

export function useOptimisticRunner<TInput, TOutput, TContext = unknown>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options: OptimisticMutationOptions<TInput, TOutput, TContext>
): OptimisticRunner<TInput, TOutput> {
  const [isPending, setIsPending] = useState(false)
  const inflight = useRef(0)

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      const id = ++inflight.current
      let context: TContext | undefined
      try {
        context = (await options.onMutate(input)) as TContext
      } catch (e) {
        // onMutate itself failed — surface as error.
        options.onError?.(e instanceof Error ? e : new Error(String(e)), input, undefined)
        return null
      }

      setIsPending(true)
      try {
        const output = await mutationFn(input)
        if (id !== inflight.current) {
          // A newer mutation has superseded this one — keep state consistent
          // by NOT calling onSuccess for the stale call.
          return output
        }
        options.onSuccess?.(output, input, context)
        options.onSettled?.(output, null, input, context)
        return output
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        if (id === inflight.current) {
          options.onError?.(error, input, context)
          options.onSettled?.(undefined, error, input, context)
        }
        return null
      } finally {
        if (id === inflight.current) setIsPending(false)
      }
    },
    [mutationFn, options]
  )

  return { isPending, mutate }
}

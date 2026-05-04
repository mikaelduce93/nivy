'use client'

/**
 * TEENS PARTY MOROCCO - State Wrapper Component
 * =============================================
 *
 * Composant unifié qui gère automatiquement tous les états UI :
 * - Loading (avec skeletons ou spinners)
 * - Error (avec retry)
 * - Empty (avec actions)
 * - Offline (avec fallback)
 * - Success (children)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loading, LoadingOverlay } from './loading'
import { ErrorBlock } from './error-block'
import { EmptyState } from './empty-state'
import { OfflineWrapper, useOnlineStatus } from './offline-indicator'

/* ==========================================================================
   TYPES
   ========================================================================== */

type EmptyPreset = 'events' | 'tickets' | 'users' | 'clubs' | 'notifications' | 'search' | 'documents' | 'favorites' | 'reviews' | 'cart' | 'inbox' | 'files' | 'photos' | 'messages'
type ErrorType = 'generic' | 'network' | 'server' | 'notFound' | 'forbidden' | 'validation'
type LoadingContext = 'events' | 'tickets' | 'profile' | 'clubs' | 'notifications' | 'payment' | 'submit' | 'save' | 'delete' | 'upload' | 'download' | 'search' | 'auth'

interface StateWrapperProps {
  /** Is data loading */
  isLoading?: boolean
  /** Error object or message */
  error?: Error | string | null
  /** Is data empty (use with isEmpty check) */
  isEmpty?: boolean
  /** Check if should show offline state */
  checkOffline?: boolean

  /* Loading configuration */
  /** Loading skeleton component */
  loadingSkeleton?: React.ReactNode
  /** Loading context for message */
  loadingContext?: LoadingContext
  /** Custom loading message */
  loadingMessage?: string
  /** Loading variant */
  loadingVariant?: 'spinner' | 'dots' | 'pulse'
  /** Use overlay loading instead of replacing content */
  loadingOverlay?: boolean

  /* Error configuration */
  /** Error type preset */
  errorType?: ErrorType
  /** Custom error title */
  errorTitle?: string
  /** Custom error description */
  errorDescription?: string
  /** Show retry button */
  showRetry?: boolean
  /** Retry callback */
  onRetry?: () => void
  /** Is currently retrying */
  isRetrying?: boolean
  /** Error size variant */
  errorSize?: 'inline' | 'card' | 'fullpage'

  /* Empty configuration */
  /** Empty state preset */
  emptyPreset?: EmptyPreset
  /** Custom empty title */
  emptyTitle?: string
  /** Custom empty description */
  emptyDescription?: string
  /** Empty action button */
  emptyAction?: {
    label: string
    href?: string
    onClick?: () => void
  }

  /* General */
  /** Children to render when data is ready */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

/* ==========================================================================
   STATE WRAPPER COMPONENT
   ========================================================================== */

export function StateWrapper({
  isLoading = false,
  error = null,
  isEmpty = false,
  checkOffline = false,
  // Loading config
  loadingSkeleton,
  loadingContext,
  loadingMessage,
  loadingVariant = 'spinner',
  loadingOverlay = false,
  // Error config
  errorType = 'generic',
  errorTitle,
  errorDescription,
  showRetry = true,
  onRetry,
  isRetrying = false,
  errorSize = 'card',
  // Empty config
  emptyPreset,
  emptyTitle,
  emptyDescription,
  emptyAction,
  // General
  children,
  className,
}: StateWrapperProps) {
  const { isOnline } = useOnlineStatus()

  // Determine content based on state priority:
  // 1. Offline (if checkOffline enabled)
  // 2. Error
  // 3. Loading
  // 4. Empty
  // 5. Children (success)

  const content = React.useMemo(() => {
    // 1. Check offline state
    if (checkOffline && !isOnline) {
      return (
        <ErrorBlock
          type="network"
          showRetry={showRetry}
          onRetry={onRetry}
          isRetrying={isRetrying}
          size={errorSize}
        />
      )
    }

    // 2. Check error state
    if (error) {
      return (
        <ErrorBlock
          type={errorType}
          title={errorTitle}
          description={errorDescription}
          error={error}
          showRetry={showRetry}
          onRetry={onRetry}
          isRetrying={isRetrying}
          size={errorSize}
        />
      )
    }

    // 3. Check loading state
    if (isLoading) {
      // If loadingOverlay, we'll handle it below
      if (!loadingOverlay) {
        if (loadingSkeleton) {
          return loadingSkeleton
        }
        return (
          <Loading
            context={loadingContext}
            message={loadingMessage}
            variant={loadingVariant}
          />
        )
      }
    }

    // 4. Check empty state
    if (isEmpty) {
      return (
        <EmptyState
          preset={emptyPreset}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )
    }

    // 5. Success - render children
    return children
  }, [
    checkOffline,
    isOnline,
    error,
    errorType,
    errorTitle,
    errorDescription,
    showRetry,
    onRetry,
    isRetrying,
    errorSize,
    isLoading,
    loadingOverlay,
    loadingSkeleton,
    loadingContext,
    loadingMessage,
    loadingVariant,
    isEmpty,
    emptyPreset,
    emptyTitle,
    emptyDescription,
    emptyAction,
    children,
  ])

  // If using loading overlay, wrap content
  if (loadingOverlay) {
    return (
      <LoadingOverlay
        isLoading={isLoading}
        message={loadingMessage}
        variant={loadingVariant}
        className={className}
      >
        {content}
      </LoadingOverlay>
    )
  }

  return <div className={className}>{content}</div>
}

/* ==========================================================================
   ASYNC STATE WRAPPER - For use with async data fetching
   ========================================================================== */

interface AsyncStateWrapperProps<T> extends Omit<StateWrapperProps, 'children' | 'isLoading' | 'error' | 'isEmpty'> {
  /** Async data */
  data: T | null | undefined
  /** Is loading */
  isLoading: boolean
  /** Error */
  error: Error | string | null
  /** Function to check if data is empty */
  isEmptyFn?: (data: T) => boolean
  /** Render function for success state */
  children: (data: T) => React.ReactNode
}

export function AsyncStateWrapper<T>({
  data,
  isLoading,
  error,
  isEmptyFn,
  children,
  ...props
}: AsyncStateWrapperProps<T>) {
  const isEmpty = React.useMemo(() => {
    if (!data) return false
    if (isEmptyFn) return isEmptyFn(data)
    if (Array.isArray(data)) return data.length === 0
    if (typeof data === 'object') return Object.keys(data).length === 0
    return false
  }, [data, isEmptyFn])

  return (
    <StateWrapper
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      {...props}
    >
      {data ? children(data) : null}
    </StateWrapper>
  )
}

/* ==========================================================================
   QUERY STATE WRAPPER - For use with React Query / SWR
   ========================================================================== */

interface QueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch?: () => void
  isRefetching?: boolean
}

interface QueryStateWrapperProps<T> extends Omit<StateWrapperProps, 'children' | 'isLoading' | 'error' | 'isEmpty' | 'onRetry' | 'isRetrying'> {
  /** Query result object */
  query: QueryResult<T>
  /** Function to check if data is empty */
  isEmptyFn?: (data: T) => boolean
  /** Render function for success state */
  children: (data: T) => React.ReactNode
}

export function QueryStateWrapper<T>({
  query,
  isEmptyFn,
  children,
  ...props
}: QueryStateWrapperProps<T>) {
  const { data, isLoading, error, refetch, isRefetching } = query

  const isEmpty = React.useMemo(() => {
    if (!data) return false
    if (isEmptyFn) return isEmptyFn(data)
    if (Array.isArray(data)) return data.length === 0
    return false
  }, [data, isEmptyFn])

  return (
    <StateWrapper
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      onRetry={refetch}
      isRetrying={isRefetching}
      {...props}
    >
      {data ? children(data) : null}
    </StateWrapper>
  )
}

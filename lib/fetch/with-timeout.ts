/**
 * Fetch wrapper with timeout support and AbortController integration
 * 
 * SECURITY: Prevents requests from blocking indefinitely
 * All network requests should use this wrapper to ensure proper timeout handling
 * 
 * FEATURES:
 * - Automatic timeout with AbortController
 * - Support for external AbortSignal (for React Query cancellation)
 * - Proper cleanup on timeout or abort
 */

export interface FetchTimeoutOptions extends RequestInit {
  timeout?: number // Timeout in milliseconds (default: 30000 = 30s)
  signal?: AbortSignal // Optional external AbortSignal (e.g., from React Query)
}

export class FetchTimeoutError extends Error {
  constructor(public url: string, public timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`)
    this.name = 'FetchTimeoutError'
  }
}

/**
 * Fetch with timeout support
 * 
 * @param url - Request URL
 * @param options - Fetch options including timeout
 * @returns Promise<Response>
 * @throws FetchTimeoutError if request times out
 * 
 * @example
 * ```ts
 * const response = await fetchWithTimeout('/api/data', {
 *   method: 'GET',
 *   timeout: 10000 // 10 seconds
 * })
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, signal: externalSignal, ...fetchOptions } = options

  // Create AbortController for timeout
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutController.abort()
  }, timeout)

  // Combine external signal with timeout signal if both exist
  let finalSignal: AbortSignal
  
  if (externalSignal) {
    // If external signal is provided, create a combined controller
    const combinedController = new AbortController()
    
    const abortCombined = () => {
      if (!combinedController.signal.aborted) {
        combinedController.abort()
      }
    }
    
    // Abort if external signal is aborted
    externalSignal.addEventListener('abort', abortCombined, { once: true })
    
    // Abort if timeout signal is aborted
    timeoutController.signal.addEventListener('abort', abortCombined, { once: true })
    
    finalSignal = combinedController.signal
  } else {
    finalSignal = timeoutController.signal
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: finalSignal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    // Check if error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      if (timeoutController.signal.aborted) {
        throw new FetchTimeoutError(url, timeout)
      }
      // If external signal was aborted, it's a cancellation (not a timeout)
      // Re-throw as AbortError to allow React Query to handle it properly
    }

    // Re-throw original error
    throw error
  }
}

/**
 * Fetch with timeout and automatic JSON parsing
 * 
 * @param url - Request URL
 * @param options - Fetch options including timeout
 * @returns Promise<T> - Parsed JSON response
 * 
 * @example
 * ```ts
 * const data = await fetchWithTimeoutJSON<User>('/api/user', {
 *   method: 'GET',
 *   timeout: 10000
 * })
 * ```
 */
export async function fetchWithTimeoutJSON<T = unknown>(
  url: string,
  options: FetchTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json() as Promise<T>
}


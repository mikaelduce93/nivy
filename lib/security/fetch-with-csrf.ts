'use client'

/**
 * #313 — self-bootstrapping CSRF fetch.
 *
 * The `csrf-token` cookie is httpOnly (server-set by GET /api/csrf), so it
 * cannot be read from `document.cookie`. Instead we fetch /api/csrf once to get
 * the token from the RESPONSE BODY (that same call also sets the cookie), then
 * send it as the `x-csrf-token` header. The server compares header === cookie
 * (validateCsrfRequest). Token is cached per page load.
 */
let cachedToken: string | null = null

async function getCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  try {
    const res = await fetch('/api/csrf', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    cachedToken = typeof data?.token === 'string' ? data.token : null
    return cachedToken
  } catch {
    return null
  }
}

export async function fetchWithCSRF(url: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await getCsrfToken()
    if (token) headers.set('x-csrf-token', token)
  }
  return fetch(url, { ...options, credentials: 'same-origin', headers })
}

// Hook React pour utiliser fetch avec CSRF
export function useFetchWithCSRF() {
  return fetchWithCSRF
}

'use client'

export async function fetchWithCSRF(url: string, options: RequestInit = {}) {
  // Récupérer le token CSRF du cookie
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1]

  // Ajouter le header CSRF pour les mutations
  const headers = new Headers(options.headers)
  if (csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
    headers.set('x-csrf-token', csrfToken)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

// Hook React pour utiliser fetch avec CSRF
export function useFetchWithCSRF() {
  return fetchWithCSRF
}

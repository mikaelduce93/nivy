// Protection CSRF pour les mutations
import { NextRequest } from 'next/server'
import { cookies, headers } from 'next/headers'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf-token'

export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomUUID()
  return token
}

export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Les GET, HEAD, OPTIONS ne nécessitent pas de CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  const headerToken = request.headers.get(CSRF_HEADER)
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false
  }

  return true
}

export async function getCSRFToken(): Promise<string> {
  const headersList = await headers()
  return headersList.get(CSRF_HEADER) || ''
}

/**
 * Double-submit CSRF check for plain `Request` route handlers (the parent
 * mutation routes use `Request`, not `NextRequest`, so `request.cookies` isn't
 * available — we read the cookie via next/headers). Mutations require
 * header `x-csrf-token` === cookie `csrf-token`. Safe methods always pass.
 */
export async function validateCsrfRequest(request: Request): Promise<boolean> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true
  const headerToken = request.headers.get(CSRF_HEADER)
  const cookieToken = (await cookies()).get(CSRF_COOKIE)?.value
  return Boolean(headerToken && cookieToken && headerToken === cookieToken)
}

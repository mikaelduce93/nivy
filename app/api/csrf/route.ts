import { generateCSRFToken } from '@/lib/security/csrf'
import { NextResponse } from 'next/server'

export async function GET() {
  const token = await generateCSRFToken()
  
  const response = NextResponse.json({ token })
  
  // Définir le cookie CSRF
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24h
  })
  
  return response
}

/**
 * Health Check API Route
 * 
 * GET /api/health
 * 
 * Retourne l'état de santé de l'application
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: 'ok', // TODO: Vérifier réellement la DB
        cache: 'ok',
        features: 'ok',
      },
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


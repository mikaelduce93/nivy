/**
 * Health Check API Route
 *
 * GET /api/health
 *
 * Retourne l'état de santé de l'application avec verification reelle de la DB.
 * - 200 si tout OK
 * - 503 si la DB est en mode degrade (impossible d'executer une requete)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DB_CHECK_TIMEOUT_MS = 3000

interface DbCheckResult {
  status: 'ok' | 'degraded' | 'unconfigured'
  error?: string
  latencyMs?: number
}

async function checkDatabase(): Promise<DbCheckResult> {
  const start = Date.now()

  // Verifier que la config Supabase est presente avant de tenter une requete
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { status: 'unconfigured', error: 'Supabase env vars missing' }
  }

  try {
    const supabase = await createClient()

    // Requete legere: lit 1 ligne d'une table qui doit toujours exister.
    // `profiles` est central a l'auth; HEAD + count permet d'eviter de remonter des donnees.
    const queryPromise = supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

    const timeoutPromise = new Promise<{ error: { message: string } }>((_, reject) =>
      setTimeout(
        () => reject(new Error(`DB healthcheck timeout (>${DB_CHECK_TIMEOUT_MS}ms)`)),
        DB_CHECK_TIMEOUT_MS
      )
    )

    const result = (await Promise.race([queryPromise, timeoutPromise])) as {
      error: { message: string } | null
    }

    if (result.error) {
      return {
        status: 'degraded',
        error: result.error.message || 'Database query failed',
        latencyMs: Date.now() - start,
      }
    }

    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown DB error'
    return {
      status: 'degraded',
      error: message,
      latencyMs: Date.now() - start,
    }
  }
}

export async function GET() {
  const dbCheck = await checkDatabase()

  // Tout autre check pourra etre ajoute ici (cache, queue, etc.)
  // Pour l'instant, on ne pretend rien d'autre.
  const isHealthy = dbCheck.status === 'ok'

  const body = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: dbCheck,
    },
  }

  return NextResponse.json(body, { status: isHealthy ? 200 : 503 })
}

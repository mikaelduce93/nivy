/**
 * API Route pour récupérer les feature flags côté client
 * 
 * GET /api/features/flags?flag=new_payment_method
 * GET /api/features/flags?flags=new_payment_method,hybrid_payment
 */

import { getFeatureFlag, getFeatureFlags } from '@/lib/features/flags'
import { NextRequest, NextResponse } from 'next/server'
import type { FeatureFlag } from '@/lib/features/flags'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const flag = searchParams.get('flag')
    const flags = searchParams.get('flags')

    // Récupérer un seul flag
    if (flag) {
      const enabled = await getFeatureFlag(flag as FeatureFlag)
      return NextResponse.json({ enabled })
    }

    // Récupérer plusieurs flags
    if (flags) {
      const flagArray = flags.split(',') as FeatureFlag[]
      const results = await getFeatureFlags(flagArray)
      return NextResponse.json({ flags: results })
    }

    return NextResponse.json(
      { error: 'Missing flag or flags parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Feature Flags API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    )
  }
}


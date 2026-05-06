import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/scorecard
 * Returns live scorecard metrics for the admin dashboard.
 *
 * Honesty rule: when a metric cannot be computed it is reported as 0 with
 * a `status: 'unavailable'` flag. We never fabricate values.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // 1. Engagement - DAU
    const { count: dauCount, error: dauError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today)

    // 2. Social actions vs total actions today
    const { count: socialActions, error: socialErr } = await supabase
      .from('xp_ledger')
      .select('*', { count: 'exact', head: true })
      .ilike('action_type', '%social%')
      .gte('created_at', today)

    const { count: totalActions, error: totalErr } = await supabase
      .from('xp_ledger')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    const allFailed = !!dauError && !!socialErr && !!totalErr
    if (allFailed) {
      return NextResponse.json(
        {
          retention: { d1: 0, d7: 0, d30: 0 },
          engagement: {
            dau: 0,
            mau: 0,
            stickyFactor: 0,
            avgSessionsPerDay: 0,
            avgSessionDuration: 0,
          },
          gamification: {
            questsCompletedPerWeek: 0,
            socialActionRate: 0,
            educationalContentRate: 0,
          },
          monetization: { conversionRate: 0 },
          status: 'unavailable',
          error: 'Underlying analytics tables are unavailable',
        },
        { status: 200 }
      )
    }

    const dau = dauCount ?? 0
    const socialRate =
      totalActions && totalActions > 0 ? ((socialActions || 0) / totalActions) * 100 : 0

    const metrics = {
      // Retention computations are not yet implemented in this endpoint.
      // Report 0 with status flag rather than inventing numbers.
      retention: { d1: 0, d7: 0, d30: 0 },
      engagement: {
        dau,
        mau: 0,
        stickyFactor: 0,
        avgSessionsPerDay: 0,
        avgSessionDuration: 0,
      },
      gamification: {
        questsCompletedPerWeek: 0,
        socialActionRate: socialRate,
        educationalContentRate: 0,
      },
      monetization: { conversionRate: 0 },
      status: 'partial',
      note:
        'Only DAU and socialActionRate are computed from live data. Other metrics require dedicated aggregation jobs.',
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Scorecard error:', error)
    return NextResponse.json(
      {
        retention: { d1: 0, d7: 0, d30: 0 },
        engagement: {
          dau: 0,
          mau: 0,
          stickyFactor: 0,
          avgSessionsPerDay: 0,
          avgSessionDuration: 0,
        },
        gamification: {
          questsCompletedPerWeek: 0,
          socialActionRate: 0,
          educationalContentRate: 0,
        },
        monetization: { conversionRate: 0 },
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    )
  }
}

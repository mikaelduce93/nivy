import { NextRequest, NextResponse } from 'next/server'
import { checkStreakDanger, checkDailyRewards } from '@/lib/notifications/triggers'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  try {
    if (type === 'streak') {
      await checkStreakDanger()
    } else if (type === 'daily') {
      await checkDailyRewards()
    } else {
      // Run all checks if no type specified
      await Promise.all([
        checkStreakDanger(),
        checkDailyRewards()
      ])
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}


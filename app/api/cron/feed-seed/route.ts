import { NextRequest, NextResponse } from 'next/server'
import { generateSystemActivity } from '@/lib/feed/system-activity'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = req.headers.get('x-vercel-cron') !== null
  if (!isVercelCron) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  try {
    await generateSystemActivity()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feed seed failed:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}


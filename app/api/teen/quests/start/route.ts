import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/auth/get-user-role'

export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { questId, teenId } = body

    if (!questId || !teenId) {
      return NextResponse.json({ error: 'Missing questId or teenId' }, { status: 400 })
    }

    // Verify the teen ID matches the logged in user
    if (teenId !== userInfo.teenData?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // #208 — cette route legacy lisait/écrivait `quests`, `quest_progress` et
    // `daily_challenges`, tables qui n'existent PLUS en base live : chaque requête
    // échouait au runtime et la route renvoyait toujours 404 "Quest not found".
    // La page de détail (app/teen/quests/[id]/page.tsx) redirige déjà vers
    // /teen/quests, donc ce endpoint est injoignable. Les quêtes unifiées passent
    // désormais par le moteur `user_challenges` et leurs vraies pages
    // (quiz/défi/passion/event). On répond explicitement au lieu d'interroger des
    // tables fantômes.
    return NextResponse.json(
      { error: 'Quest not found', gone: true },
      { status: 404 },
    )
  } catch (error) {
    console.error('Error starting quest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth/get-user-role'
import { QuestDetailClient } from './quest-detail-client'

interface QuestDetailPageProps {
  params: Promise<{ id: string }>
}

async function getQuestData(_questId: string, _teenId: string) {
  // #208 — les tables `quests`/`daily_challenges`/`challenges` n'existent pas en
  // base live : la lecture échouait systématiquement au runtime et cette route
  // renvoyait toujours vers le hub. On retourne null directement (repli ci-dessous)
  // plutôt que d'interroger des tables fantômes.
  return null
}

export default async function QuestDetailPage({ params }: QuestDetailPageProps) {
  const { id } = await params
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== 'teen') {
    notFound()
  }

  const teenId = userInfo.teenData?.id || ''
  const quest = await getQuestData(id, teenId)

  if (!quest) {
    // #208 — les quêtes unifiées routent désormais vers leur vraie page (quiz/
    // défi/passion/event). Cette route legacy interroge des tables qui n'existent
    // pas (`quests`/`daily_challenges`) ; en repli on renvoie au hub plutôt qu'un 404.
    redirect('/teen/quests')
  }

  return (
    <Suspense fallback={<QuestDetailSkeleton />}>
      <QuestDetailClient quest={quest} teenId={teenId} />
    </Suspense>
  )
}

function QuestDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back button */}
        <div className="h-10 w-24 bg-paper-2 rounded-xl" />
        
        {/* Header */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-paper-2 rounded-lg" />
          <div className="h-12 w-3/4 bg-paper-2 rounded-xl" />
          <div className="h-6 w-1/2 bg-paper-2 rounded-lg" />
        </div>
        
        {/* Steps */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-paper-2 rounded-2xl" />
          ))}
        </div>
        
        {/* Action button */}
        <div className="h-14 w-full bg-paper-2 rounded-2xl" />
      </div>
    </div>
  )
}

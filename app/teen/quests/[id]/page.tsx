import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getUserRole } from '@/lib/auth/get-user-role'
import { createClient } from '@/lib/supabase/server'
import { QuestDetailClient } from './quest-detail-client'

interface QuestDetailPageProps {
  params: Promise<{ id: string }>
}

async function getQuestData(questId: string, teenId: string) {
  const supabase = await createClient()
  
  // Try to fetch from quests table
  const { data: quest, error } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single()

  if (error || !quest) {
    // Try challenges table
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('*, challenge:challenges(*)')
      .eq('id', questId)
      .eq('teen_id', teenId)
      .single()

    if (challenge) {
      return {
        id: challenge.id,
        title: challenge.challenge?.title || 'Daily Challenge',
        description: challenge.challenge?.description || '',
        xp_reward: challenge.challenge?.xp_reward || 50,
        pillar: 'vitality' as const,
        type: 'challenge' as const,
        status: challenge.status,
        steps: challenge.challenge?.steps || [],
        duration: '10 min',
        difficulty: 'medium' as const,
      }
    }
    return null
  }

  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    xp_reward: quest.xp_reward,
    pillar: quest.pillar || 'intellect',
    type: quest.type || 'quest',
    status: quest.status || 'available',
    steps: quest.steps || [],
    duration: quest.duration || '15 min',
    difficulty: quest.difficulty || 'medium',
    deadline: quest.deadline,
    requirements: quest.requirements,
  }
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
    notFound()
  }

  return (
    <Suspense fallback={<QuestDetailSkeleton />}>
      <QuestDetailClient quest={quest} teenId={teenId} />
    </Suspense>
  )
}

function QuestDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#020203] p-4 sm:p-8 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back button */}
        <div className="h-10 w-24 bg-white/5 rounded-xl" />
        
        {/* Header */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-white/5 rounded-lg" />
          <div className="h-12 w-3/4 bg-white/5 rounded-xl" />
          <div className="h-6 w-1/2 bg-white/5 rounded-lg" />
        </div>
        
        {/* Steps */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl" />
          ))}
        </div>
        
        {/* Action button */}
        <div className="h-14 w-full bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}

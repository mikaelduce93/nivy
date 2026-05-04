import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getDailyMissions } from "@/gamification-system/features/missions/actions"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"

export type QuestType = "quiz" | "challenge" | "passion" | "event" | "club"
export type QuestStatus = "available" | "in_progress" | "completed" | "pending_review"

export interface UnifiedQuest {
  id: string
  type: QuestType
  pillar: "intellect" | "vitality" | "creativity" | "social"
  title: string
  description: string
  xp_reward: number
  status: QuestStatus
  progress?: number
  deadline?: string
  image_url?: string
  metadata?: any
}

export async function getUnifiedQuests(): Promise<UnifiedQuest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const dashboardData = await getTeenDashboardData()
  if (!dashboardData) return []

  const teenId = user.id
  const quests: UnifiedQuest[] = []

  // 1. INTELLECT: AI Quizzes
  const { data: quizzes } = await supabase
    .from("educational_quizzes")
    .select("*")
    .eq("is_active", true)
    .limit(3)

  if (quizzes) {
    quizzes.forEach(q => {
      quests.push({
        id: q.id,
        type: "quiz",
        pillar: "intellect",
        title: q.title,
        description: q.description || `Quête Intellect: ${q.subject}`,
        xp_reward: q.xp_reward,
        status: "available",
        metadata: { subject: q.subject, difficulty: q.difficulty }
      })
    })
  }

  // 2. VITALITY: Physical Challenges
  const { data: physicalChallenges } = await supabase
    .from("physical_challenges")
    .select("*")
    .eq("is_active", true)
    .limit(2)

  if (physicalChallenges) {
    physicalChallenges.forEach(c => {
      quests.push({
        id: c.id,
        type: "challenge",
        pillar: "vitality",
        title: c.name,
        description: c.description,
        xp_reward: c.xp_reward,
        status: "available",
        metadata: { category: c.sport_category, unit: c.objective_unit, target: c.objective_value }
      })
    })
  }

  // 3. CREATIVITY: Passion Paths & Tutorials
  const { data: creations } = await supabase
    .from("passion_tutorials")
    .select("*, path:path_id(*)")
    .limit(2)

  if (creations) {
    creations.forEach(t => {
      quests.push({
        id: t.id,
        type: "passion",
        pillar: "creativity",
        title: t.title,
        description: t.description,
        xp_reward: t.xp_reward,
        status: "available",
        metadata: { path: t.path?.name, difficulty: t.difficulty }
      })
    })
  }

  // 4. SOCIAL: Events & Clubs
  if (dashboardData.upcomingEvents) {
    dashboardData.upcomingEvents.slice(0, 3).forEach(e => {
      quests.push({
        id: e.id,
        type: "event",
        pillar: "social",
        title: e.title,
        description: `${e.venue} • ${e.date}`,
        xp_reward: 500, // Fixed for events
        status: e.rsvpStatus === "confirmed" ? "in_progress" : "available",
        image_url: e.imageUrl || undefined,
        metadata: { rsvp: e.rsvpStatus, category: e.category }
      })
    })
  }

  // Randomize or sort by priority
  return quests.sort(() => Math.random() - 0.5)
}

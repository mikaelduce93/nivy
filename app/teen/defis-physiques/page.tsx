import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DefisPhysiquesClient, type ApiChallenge, type ApiStats } from "./defis-physiques-client"

async function getSportChallenges(teenId: string): Promise<{ challenges: ApiChallenge[]; stats: ApiStats }> {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from("physical_challenges")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const { data: progress } = await supabase
    .from("teen_physical_challenge_progress")
    .select("*")
    .eq("teen_id", teenId)

  const enriched = (challenges || []).map((challenge: any) => {
    const cp = progress?.find((p: any) => p.challenge_id === challenge.id)
    return {
      ...challenge,
      progress: cp
        ? {
            current_value: cp.current_value,
            progress_percent: Math.min(
              100,
              Math.round((cp.current_value / Math.max(1, challenge.objective_value)) * 100)
            ),
            completed: cp.completed,
          }
        : null,
      is_started: !!cp,
      is_completed: cp?.completed || false,
    }
  })

  const stats: ApiStats = {
    total: challenges?.length || 0,
    started: enriched.filter((c) => c.is_started).length,
    completed: enriched.filter((c) => c.is_completed).length,
    totalXpEarned: progress?.reduce((s: number, p: any) => s + (p.xp_earned || 0), 0) || 0,
  }

  return { challenges: enriched as ApiChallenge[], stats }
}

export default async function DefisPhysiquesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")

  const teenId = userInfo.teenData?.id
  if (!teenId) redirect("/teen")

  const data = await getSportChallenges(teenId).catch(() => ({
    challenges: [],
    stats: { total: 0, started: 0, completed: 0, totalXpEarned: 0 },
  }))

  return <DefisPhysiquesClient challenges={data.challenges} stats={data.stats} />
}

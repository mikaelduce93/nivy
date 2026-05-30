"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Award, Star, Zap, Users, Calendar, Heart, Target } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  category: string
  unlocked_at: string | null
  progress?: number
  requirement?: number
}

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  award: Award,
  star: Star,
  zap: Zap,
  users: Users,
  calendar: Calendar,
  heart: Heart,
  target: Target,
}

export function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAchievements()
  }, [])

  async function loadAchievements() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("user_achievements")
      .select(`
        *,
        achievements (*)
      `)
      .eq("parent_id", user.id)

    if (data) {
      setAchievements(
        data.map((item: any) => ({
          ...item.achievements,
          unlocked_at: item.unlocked_at,
          progress: item.progress,
        })),
      )
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-mute">Chargement des achievements...</div>
  }

  const unlockedAchievements = achievements.filter((a) => a.unlocked_at)
  const lockedAchievements = achievements.filter((a) => !a.unlocked_at)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-black text-ink mb-2">Vos Achievements</h2>
        <p className="text-mute">
          {unlockedAchievements.length} / {achievements.length} débloqués
        </p>
      </div>

      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-ink mb-4">Débloqués</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedAchievements.map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy

              return (
                <Card
                  key={achievement.id}
                  className="p-6 bg-gradient-to-br from-teal/10 to-teal/10 border-teal/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-ink" />
                    </div>

                    <div className="flex-1">
                      <h4 className="text-ink font-bold mb-1">{achievement.name}</h4>
                      <p className="text-mute text-sm mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-teal font-bold">+{achievement.points} points</span>
                        {achievement.unlocked_at && (
                          <span className="text-mute text-xs">
                            {new Date(achievement.unlocked_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-ink mb-4">À débloquer</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedAchievements.map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy
              const progress = achievement.progress || 0
              const requirement = achievement.requirement || 1
              const percentage = Math.min((progress / requirement) * 100, 100)

              return (
                <Card key={achievement.id} className="p-6 bg-card border-ink opacity-60">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-mute" />
                    </div>

                    <div className="flex-1">
                      <h4 className="text-ink font-bold mb-1">{achievement.name}</h4>
                      <p className="text-mute text-sm mb-2">{achievement.description}</p>

                      {percentage > 0 && (
                        <div className="mb-2">
                          <div className="h-2 bg-card rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal to-teal"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-mute mt-1">
                            {progress} / {requirement}
                          </p>
                        </div>
                      )}

                      <span className="text-mute font-bold text-sm">+{achievement.points} points</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

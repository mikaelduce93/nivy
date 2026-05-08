import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  Plus,
  ArrowLeft,
  Crown,
  Coins,
  Calendar,
  TrendingUp,
  MoreVertical,
  Settings,
  CreditCard,
  Eye,
  Shield
} from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"

async function getLinkedTeens(parentId: string) {
  const supabase = await createClient()

  const { data: teens, error } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", parentId)

  if (error) {
    console.error("Error fetching teens:", error)
    return []
  }

  return teens || []
}

async function getTeenStats(teenIds: string[]) {
  if (teenIds.length === 0) return {}

  const supabase = await createClient()
  const stats: Record<string, any> = {}

  for (const teenId of teenIds) {
    // Get booking count
    const { count: bookingsCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("teen_id", teenId)

    // Get upcoming events
    const { count: upcomingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("teen_id", teenId)
      .eq("status", "confirmed")
      .gte("event_date", new Date().toISOString())

    // Get this month's spending
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .eq("teen_id", teenId)
      .gte("created_at", startOfMonth.toISOString())

    const monthlySpending = monthlyBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

    stats[teenId] = {
      totalBookings: bookingsCount || 0,
      upcomingEvents: upcomingCount || 0,
      monthlySpending
    }
  }

  return stats
}

export default async function ParentTeensPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const teens = await getLinkedTeens(userInfo.profileId)
  const teenIds = teens.map((t: any) => t.teen_id)
  const stats = await getTeenStats(teenIds)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Mes Teens</h1>
            <p className="text-zinc-400">Gérez les comptes de vos adolescents</p>
          </div>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Link href="/parent/teens/add">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un Teen
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Total Teens</p>
                  <p className="text-3xl font-black text-white">{teens.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 font-medium">Total Coins</p>
                  <p className="text-3xl font-black text-white">
                    {teens.reduce((sum: number, t: any) => sum + (t.total_coins || 0), 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Events à venir</p>
                  <p className="text-3xl font-black text-white">
                    {Object.values(stats).reduce((sum: number, s: any) => sum + (s.upcomingEvents || 0), 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border-cyan-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-cyan-400 font-medium">Niveau moyen</p>
                  <p className="text-3xl font-black text-white">
                    {teens.length > 0
                      ? Math.round(teens.reduce((sum: number, t: any) => sum + (t.level || 1), 0) / teens.length)
                      : 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teens List */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Liste des Teens ({teens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teens.length > 0 ? (
              <div className="space-y-4">
                {teens.map((teen: any) => {
                  const teenStats = stats[teen.teen_id] || {}
                  return (
                    <div
                      key={teen.teen_id}
                      className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Teen Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl">
                            {teen.teen_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{teen.teen_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <span>{teen.title_icon} {teen.title}</span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-emerald-400">Niveau {teen.level}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                              <span>{teen.total_xp || 0} XP</span>
                              <span>•</span>
                              <span>{teen.badges_count || 0} badges</span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-black text-yellow-400">{teen.total_coins || 0}</p>
                            <p className="text-xs text-zinc-500">Coins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-purple-400">{teenStats.upcomingEvents || 0}</p>
                            <p className="text-xs text-zinc-500">Events</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-blue-400">{teenStats.monthlySpending || 0} DH</p>
                            <p className="text-xs text-zinc-500">Ce mois</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400"
                            asChild
                          >
                            <Link href={`/parent/teens/${teen.teen_id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Détails
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:border-blue-500/50 hover:text-blue-400"
                            asChild
                          >
                            <Link href={`/parent/topup?teen=${teen.teen_id}`}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Top-up
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:border-purple-500/50 hover:text-purple-400"
                            asChild
                          >
                            <Link href={`/parent/budget?teen=${teen.teen_id}`}>
                              <Shield className="h-4 w-4 mr-2" />
                              Limites
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                          <span>Progression vers niveau {(teen.level || 1) + 1}</span>
                          <span>{teen.total_xp || 0} / {((teen.level || 1) + 1) * 100} XP</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(((teen.total_xp || 0) / (((teen.level || 1) + 1) * 100)) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                size="large"
                title="Aucun teen lié"
                description="Ajoutez votre premier teen pour commencer à gérer son compte"
                action={{ label: "Ajouter un Teen", href: "/parent/teens/add" }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

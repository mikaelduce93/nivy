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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Mes Teens</h1>
            <p className="text-mute">Gérez les comptes de vos adolescents</p>
          </div>
          <Button asChild className="bg-lime hover:bg-lime text-ink">
            <Link href="/parent/teens/add">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un Teen
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Total Teens</p>
                  <p className="text-3xl font-black text-ink">{teens.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Total Coins</p>
                  <p className="text-3xl font-black text-ink">
                    {teens.reduce((sum: number, t: any) => sum + (t.total_coins || 0), 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Events à venir</p>
                  <p className="text-3xl font-black text-ink">
                    {Object.values(stats).reduce((sum: number, s: any) => sum + (s.upcomingEvents || 0), 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-lime/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Niveau moyen</p>
                  <p className="text-3xl font-black text-ink">
                    {teens.length > 0
                      ? Math.round(teens.reduce((sum: number, t: any) => sum + (t.level || 1), 0) / teens.length)
                      : 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teens List */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-lime" />
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
                      className="p-6 rounded-2xl bg-card border border-ink hover:border-lime/30 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Teen Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-lime to-teal flex items-center justify-center text-ink font-black text-2xl">
                            {teen.teen_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-ink">{teen.teen_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-mute">
                              <span>{teen.title_icon} {teen.title}</span>
                              <span className="text-mute">•</span>
                              <span className="text-lime">Niveau {teen.level}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-mute">
                              <span>{teen.total_xp || 0} XP</span>
                              <span>•</span>
                              <span>{teen.badges_count || 0} badges</span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-black text-gold">{teen.total_coins || 0}</p>
                            <p className="text-xs text-mute">Coins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-pink">{teenStats.upcomingEvents || 0}</p>
                            <p className="text-xs text-mute">Events</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black text-teal">{teenStats.monthlySpending || 0} DH</p>
                            <p className="text-xs text-mute">Ce mois</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-ink text-ink-2 hover:border-lime/50 hover:text-lime"
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
                            className="border-ink text-ink-2 hover:border-teal/50 hover:text-teal"
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
                            className="border-ink text-ink-2 hover:border-pink/50 hover:text-pink"
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
                      <div className="mt-4 pt-4 border-t border-ink">
                        <div className="flex items-center justify-between text-xs text-mute mb-2">
                          <span>Progression vers niveau {(teen.level || 1) + 1}</span>
                          <span>{teen.total_xp || 0} / {((teen.level || 1) + 1) * 100} XP</span>
                        </div>
                        <div className="h-2 bg-card rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-lime to-teal rounded-full transition-all"
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

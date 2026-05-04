import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  Star,
  CheckCircle,
  Clock,
  UserPlus
} from "lucide-react"
import Link from "next/link"

async function getAmbassadorReferrals(profileId: string) {
  const supabase = await createClient()

  // Get ambassador data
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, total_referrals, total_earnings")
    .eq("profile_id", profileId)
    .single()

  if (!ambassador) return { referrals: [], stats: null }

  // Get all referrals with user details
  const { data: referrals, error } = await supabase
    .from("referral_usage")
    .select(`
      id,
      commission_amount,
      status,
      created_at,
      user:user_id (
        id,
        full_name,
        email,
        role,
        created_at
      )
    `)
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching referrals:", error)
    return { referrals: [], stats: { totalReferrals: 0, totalEarnings: 0 } }
  }

  // Calculate stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())

  const monthlyReferrals = referrals?.filter(r => new Date(r.created_at) >= startOfMonth).length || 0
  const weeklyReferrals = referrals?.filter(r => new Date(r.created_at) >= startOfWeek).length || 0
  const activeReferrals = referrals?.filter(r => r.status === "active" || !r.status).length || 0

  return {
    referrals: referrals || [],
    stats: {
      totalReferrals: ambassador.total_referrals || referrals?.length || 0,
      totalEarnings: ambassador.total_earnings || 0,
      monthlyReferrals,
      weeklyReferrals,
      activeReferrals
    }
  }
}

export default async function AmbassadorReferralsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const { referrals, stats } = await getAmbassadorReferrals(userInfo.profileId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
    return formatDate(dateString)
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
      case null:
      case undefined:
        return {
          icon: CheckCircle,
          text: "Actif",
          class: "bg-emerald-500/20 text-emerald-400"
        }
      case "pending":
        return {
          icon: Clock,
          text: "En attente",
          class: "bg-amber-500/20 text-amber-400"
        }
      case "inactive":
        return {
          icon: Clock,
          text: "Inactif",
          class: "bg-zinc-500/20 text-zinc-400"
        }
      default:
        return {
          icon: CheckCircle,
          text: status,
          class: "bg-zinc-500/20 text-zinc-400"
        }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Mes Filleuls</h1>
            <p className="text-zinc-400">Suivez tous vos parrainages</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Total</p>
                  <p className="text-3xl font-black text-white">{stats?.totalReferrals || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Actifs</p>
                  <p className="text-3xl font-black text-white">{stats?.activeReferrals || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-white">+{stats?.monthlyReferrals || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">Cette semaine</p>
                  <p className="text-3xl font-black text-white">+{stats?.weeklyReferrals || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-400 font-medium">Gains totaux</p>
                  <p className="text-3xl font-black text-white">{stats?.totalEarnings || 0} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Star className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals List */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Liste des filleuls ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length > 0 ? (
              <div className="space-y-3">
                {referrals.map((referral: any) => {
                  const status = getStatusBadge(referral.status)
                  const StatusIcon = status.icon
                  const userName = referral.user?.full_name || "Utilisateur"
                  const userEmail = referral.user?.email || ""
                  const userRole = referral.user?.role || "user"

                  return (
                    <div
                      key={referral.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-xl">
                          {userName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{userName}</h3>
                          <p className="text-sm text-zinc-400">{userEmail}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                              {userRole === "teen" ? "Teen" : userRole === "parent" ? "Parent" : "Utilisateur"}
                            </span>
                            <span className="text-xs text-zinc-500">
                              Inscrit {getRelativeTime(referral.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-400">
                            +{referral.commission_amount || 0} DH
                          </p>
                          <p className="text-xs text-zinc-500">Commission</p>
                        </div>
                        <span className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full ${status.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <UserPlus className="h-20 w-20 mx-auto mb-6 text-zinc-700" />
                <h3 className="text-2xl font-bold text-white mb-2">Pas encore de filleuls</h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                  Partagez votre code de parrainage pour commencer à gagner des commissions
                </p>
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Link href="/ambassador">
                    Partager mon code
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Star className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Comment gagner plus ?</h3>
              <p className="text-sm text-zinc-400">
                Plus vos filleuls sont actifs (réservations, achats), plus vous gagnez de commissions récurrentes.
                Partagez votre code sur les réseaux sociaux et auprès de votre entourage pour maximiser vos gains.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

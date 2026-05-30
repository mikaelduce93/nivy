import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { DarkSurface, NivCoach, NivEmpty } from "@/components/brand"
import {
  Users,
  Plus,
  ArrowLeft,
  Coins,
  Calendar,
  TrendingUp,
  CreditCard,
  Eye,
  Shield
} from "lucide-react"
import Link from "next/link"

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

  const totalCoins = teens.reduce((sum: number, t: any) => sum + (t.total_coins || 0), 0)
  const totalUpcoming = Object.values(stats).reduce(
    (sum: number, s: any) => sum + (s.upcomingEvents || 0),
    0,
  )
  const avgLevel =
    teens.length > 0
      ? Math.round(teens.reduce((sum: number, t: any) => sum + (t.level || 1), 0) / teens.length)
      : 0

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <p className="eyebrow tracking-[0.16em] text-mute">Ton crew</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold text-ink">
              Mes <em className="font-semibold italic text-pink">teens</em>
            </h1>
            <p className="mt-1 text-mute">Gère les comptes de tes ados au même endroit</p>
          </div>
          <Button asChild variant="pink">
            <Link href="/parent/teens/add">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un teen
            </Link>
          </Button>
        </div>

        {/* Niv coach */}
        <NivCoach
          mood="happy"
          className="mb-8"
          message="Salut ! Ici tu gardes un œil sur le crew : coins, niveaux et events à venir. Choisis un ado pour entrer dans le détail."
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Total teens</p>
              <Users className="h-5 w-5 text-lime" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-lime">
              {teens.length}
            </p>
          </StickerCard>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Total coins</p>
              <Coins className="h-5 w-5 text-coral" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-coral">
              <span className="mr-0.5 align-baseline font-mono text-xl">⊙</span>
              {totalCoins}
            </p>
          </StickerCard>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Events à venir</p>
              <Calendar className="h-5 w-5 text-pink" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-pink">
              {totalUpcoming}
            </p>
          </StickerCard>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Niveau moyen</p>
              <TrendingUp className="h-5 w-5 text-teal" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-teal">
              {avgLevel}
            </p>
          </StickerCard>
        </div>

        {/* Teens List */}
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-lime" aria-hidden="true" />
          <h2 className="font-display text-xl font-extrabold text-ink">
            Liste des teens ({teens.length})
          </h2>
        </div>

        {teens.length > 0 ? (
          <div className="space-y-4">
            {teens.map((teen: any) => {
              const level = teen.level || 1
              const xpForNext = (level + 1) * 100
              const currentXp = teen.total_xp || 0
              const progressRatio = Math.min(currentXp / xpForNext, 1)
              return (
                <StickerCard key={teen.teen_id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Teen Info */}
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center font-display text-2xl font-extrabold text-ink">
                        {teen.teen_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-extrabold text-ink">
                          {teen.teen_name}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2 text-sm">
                          <span className="text-mute">{teen.title_icon} {teen.title}</span>
                          <span className="text-mute">•</span>
                          <span className="font-mono text-xs font-bold uppercase tracking-wide text-teal">
                            Niveau {teen.level}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-gold">
                            {currentXp} XP
                          </span>
                          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-mute">
                            {teen.badges_count || 0} badges
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coins solde — mini surface sombre */}
                    <DarkSurface tone="coral" className="px-5 py-3 text-center">
                      <p className="eyebrow tracking-[0.14em] text-paper/60">Coins</p>
                      <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums text-coral">
                        <span className="mr-0.5 align-baseline font-mono text-base">⊙</span>
                        {teen.total_coins || 0}
                      </p>
                    </DarkSurface>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" asChild>
                        <Link href={`/parent/teens/${teen.teen_id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Détails
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/parent/topup?teen=${teen.teen_id}`}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Top-up
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/parent/budget?teen=${teen.teen_id}`}>
                          <Shield className="h-4 w-4 mr-2" />
                          Limites
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-4 pt-4 border-t-2 border-line">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-teal">
                        Vers niveau {level + 1}
                      </span>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-gold">
                        {currentXp} / {xpForNext} XP
                      </span>
                    </div>
                    <SegmentedProgress
                      steps={10}
                      current={Math.round(progressRatio * 10)}
                    />
                  </div>
                </StickerCard>
              )
            })}
          </div>
        ) : (
          <NivEmpty
            title="Aucun teen lié"
            description="Ajoute ton premier ado pour commencer à gérer son compte."
            action={
              <Button asChild variant="pink">
                <Link href="/parent/teens/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un teen
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}

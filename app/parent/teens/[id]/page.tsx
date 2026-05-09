import { getUserRole } from "@/lib/auth/get-user-role"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  CreditCard,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react"
import Link from "next/link"

/**
 * Wave 6D — Parent's per-teen detail. The /parent/teens list cards link
 * here; before this page existed the link silently 404'd.
 *
 * Honest scope: this surface only shows fields that are real on the
 * canonical `parent_teens_overview` view (Wave 1B). It deliberately does
 * NOT synthesise charts, recent-activity feeds, or "favourite events"
 * panels — those would be either fake placeholders or out-of-scope new
 * features. CTAs route to the real per-teen action surfaces (top-up,
 * budget, allowances, chores, approvals filtered by teen).
 */
export default async function ParentTeenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const supabase = await createClient()

  // Wave 6D — RLS on parent_teens_overview should already restrict to the
  // calling parent. We add the explicit `.eq("parent_id", …)` for
  // defence-in-depth so a path manipulation cannot return another parent's
  // teen even if RLS is misconfigured during a future migration.
  const { data: teen } = await supabase
    .from("parent_teens_overview")
    .select(
      "teen_id, teen_name, level, title, title_icon, total_xp, total_coins, badges_count",
    )
    .eq("parent_id", userInfo.profileId)
    .eq("teen_id", id)
    .maybeSingle()

  if (!teen) {
    // Either the teen doesn't exist OR the calling parent isn't linked to
    // them. We don't differentiate (don't leak existence of other parents'
    // teens) — both surface as a 404.
    notFound()
  }

  const xpForNext = ((teen.level || 1) + 1) * 100
  const progressPct = Math.min(((teen.total_xp || 0) / xpForNext) * 100, 100)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent/teens">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-3xl">
            {teen.teen_name?.charAt(0) || "?"}
          </div>
          <div>
            <h1 className="text-3xl font-black">{teen.teen_name}</h1>
            <p className="text-zinc-400 flex items-center gap-2 mt-1">
              <span>{teen.title_icon} {teen.title}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400">Niveau {teen.level}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Coins</p>
                  <p className="text-xl font-black text-yellow-400">{teen.total_coins ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-500/15 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">XP</p>
                  <p className="text-xl font-black text-cyan-400">{teen.total_xp ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Badges</p>
                  <p className="text-xl font-black text-purple-400">{teen.badges_count ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Niveau</p>
                  <p className="text-xl font-black text-emerald-400">{teen.level ?? 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-base text-white">Progression vers niveau {(teen.level || 1) + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>{teen.total_xp ?? 0} XP</span>
              <span>{xpForNext} XP requis</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button asChild variant="outline" className="border-zinc-700 hover:border-blue-500/50 hover:text-blue-400 justify-start">
            <Link href={`/parent/topup?teen=${teen.teen_id}`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Recharger les coins
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 hover:border-purple-500/50 hover:text-purple-400 justify-start">
            <Link href={`/parent/budget?teen=${teen.teen_id}`}>
              <Shield className="h-4 w-4 mr-2" />
              Limites &amp; budget
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400 justify-start">
            <Link href={`/parent/allowances?teen=${teen.teen_id}`}>
              <Coins className="h-4 w-4 mr-2" />
              Allowances
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-700 hover:border-amber-500/50 hover:text-amber-400 justify-start">
            <Link href={`/parent/chores?teen=${teen.teen_id}`}>
              <Trophy className="h-4 w-4 mr-2" />
              Chores
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

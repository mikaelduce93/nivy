import { getUserRole } from "@/lib/auth/get-user-role"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { StatHero, NivCoach } from "@/components/brand"
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
  const progressRatio = Math.min((teen.total_xp || 0) / xpForNext, 1)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/teens">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <div className="h-20 w-20 shrink-0 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center font-display text-3xl font-extrabold text-ink">
            {teen.teen_name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="eyebrow tracking-[0.16em] text-teal">
              Niveau {teen.level} · {teen.title_icon} {teen.title}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold">{teen.teen_name}</h1>
          </div>
        </div>

        {/* Solde Coins — hero */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <StatHero
            eyebrow="Solde coins"
            value={teen.total_coins ?? 0}
            tone="coral"
            size="lg"
            icon={<Coins className="h-6 w-6" aria-hidden="true" />}
            meta={
              <span className="font-mono">
                <span className="text-coral">⊙</span> disponibles pour {teen.teen_name}
              </span>
            }
          />
          <NivCoach
            mood="proud"
            message={`${teen.teen_name} est niveau ${teen.level} avec ${teen.total_xp ?? 0} XP — encore ${Math.max(xpForNext - (teen.total_xp ?? 0), 0)} XP avant le niveau ${(teen.level || 1) + 1}. Beau parcours !`}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Coins</p>
              <Coins className="h-5 w-5 text-coral" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-coral">
              <span className="mr-0.5 align-baseline font-mono text-base">⊙</span>
              {teen.total_coins ?? 0}
            </p>
          </StickerCard>
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">XP</p>
              <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-gold">
              {teen.total_xp ?? 0}
            </p>
          </StickerCard>
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Badges</p>
              <Trophy className="h-5 w-5 text-pink" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-pink">
              {teen.badges_count ?? 0}
            </p>
          </StickerCard>
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow tracking-[0.14em] text-mute">Niveau</p>
              <TrendingUp className="h-5 w-5 text-teal" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-teal">
              {teen.level ?? 1}
            </p>
          </StickerCard>
        </div>

        {/* Progression */}
        <StickerCard className="p-6 mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-ink">
              Progression vers niveau {(teen.level || 1) + 1}
            </h2>
            <span className="font-mono text-xs font-bold uppercase tracking-wide text-gold">
              {teen.total_xp ?? 0} / {xpForNext} XP
            </span>
          </div>
          <SegmentedProgress steps={10} current={Math.round(progressRatio * 10)} />
        </StickerCard>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button asChild className="justify-start">
            <Link href={`/parent/topup?teen=${teen.teen_id}`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Recharger les coins
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href={`/parent/budget?teen=${teen.teen_id}`}>
              <Shield className="h-4 w-4 mr-2" />
              Limites &amp; budget
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href={`/parent/allowances?teen=${teen.teen_id}`}>
              <Coins className="h-4 w-4 mr-2" />
              Allowances
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
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

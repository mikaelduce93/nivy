import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { StatHero } from "@/components/brand"
import { NivEmpty } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CATS } from "../awards-categories"

export const metadata: Metadata = { title: "Détail attribution — Partenaire" }

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  auto_approved: "Approuvé auto",
  rejected: "Refusé",
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-gold",
  approved: "bg-lime",
  auto_approved: "bg-lime",
  rejected: "bg-coral",
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.id, c.label]))

// Refonte V1.5 (#99) — détail/revue d'une attribution d'XP.
export default async function AwardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let award: { amount_xp?: number; category?: string; reason?: string; parent_review_status?: string; awarded_at?: string } | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partner_xp_awards")
      .select("amount_xp, category, reason, parent_review_status, awarded_at")
      .eq("id", id)
      .maybeSingle()
    award = data
  } catch {
    award = null
  }

  const status = award?.parent_review_status || "pending"

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/partner/awards">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Attributions
        </Link>
      </Button>

      <header className="space-y-2">
        <p className="eyebrow">Attribution XP</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Détail de l'<em className="font-semibold italic text-pink">attribution</em>
        </h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>

      {award ? (
        <div className="space-y-6">
          {/* Bloc montant — surface sombre ponctuelle, chiffre Bricolage géant gold. */}
          <StatHero
            eyebrow="XP attribué"
            tone="gold"
            value={`+${award.amount_xp}`}
            unit="XP"
            meta={
              <span
                className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink ${STATUS_TONE[status] || "bg-paper-2"}`}
              >
                {STATUS_LABEL[status] || status}
              </span>
            }
          />

          {/* Méta — catégorie en label+emoji, raison, date. */}
          <StickerCard className="gap-3 p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Catégorie</dt>
                <dd className="font-semibold text-ink">{CAT_LABEL[award.category || ""] || award.category}</dd>
              </div>
              {award.reason && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Raison</dt>
                  <dd className="text-right text-ink-2">{award.reason}</dd>
                </div>
              )}
              {award.awarded_at && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Date</dt>
                  <dd className="font-mono text-ink-2">{new Date(award.awarded_at).toLocaleString("fr-FR")}</dd>
                </div>
              )}
            </dl>
          </StickerCard>
        </div>
      ) : (
        <NivEmpty
          mood="calm"
          title="Attribution introuvable"
          description="Cette attribution n'existe pas ou n'est plus accessible."
          action={
            <Button asChild variant="pink">
              <Link href="/partner/awards">Retour aux attributions</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}

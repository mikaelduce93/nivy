import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { StatHero } from "@/components/brand"
import { NivEmpty } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

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

// Refonte V1.5 (#99) — détail/revue d'une attribution d'XP.
export default async function AwardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Aligné sur le schéma live : amount (ex amount_xp), created_at (ex awarded_at),
  // statut dérivé de approved_by_parent (colonnes category/parent_review_status/awarded_at inexistantes).
  let award: { amount: number; reason: string | null; approved_by_parent: boolean | null; created_at: string } | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partner_xp_awards")
      .select("amount, reason, approved_by_parent, created_at")
      .eq("id", id)
      .maybeSingle()
    award = data
  } catch {
    award = null
  }

  const status = award ? (award.approved_by_parent === true ? "approved" : award.approved_by_parent === false ? "rejected" : "pending") : "pending"

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
            value={`+${award.amount}`}
            unit="XP"
            meta={
              <span
                className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink ${STATUS_TONE[status] || "bg-paper-2"}`}
              >
                {STATUS_LABEL[status] || status}
              </span>
            }
          />

          {/* Méta — raison, date. */}
          <StickerCard className="gap-3 p-6">
            <dl className="space-y-3 text-sm">
              {award.reason && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Raison</dt>
                  <dd className="text-right text-ink-2">{award.reason}</dd>
                </div>
              )}
              {award.created_at && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Date</dt>
                  <dd className="font-mono text-ink-2">{new Date(award.created_at).toLocaleString("fr-FR")}</dd>
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

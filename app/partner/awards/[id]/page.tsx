import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Détail attribution — Partenaire" }

const STATUS: Record<string, "pending" | "success" | "danger" | "info"> = {
  pending: "pending", approved: "success", auto_approved: "success", rejected: "danger",
}

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

  return (
    <div className="space-y-6 pt-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/partner/awards"><ArrowLeft className="w-4 h-4 mr-1" />Attributions</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Attribution XP</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Détail</h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>
      {award ? (
        <Card className="p-6 gap-4">
          <div className="px-6 flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-3xl font-extrabold text-gold"><Zap className="w-7 h-7" />+{award.amount_xp} XP</span>
            <StatusBadge variant={STATUS[award.parent_review_status || "pending"] || "pending"} label={award.parent_review_status || "pending"} />
          </div>
          <div className="px-6 text-sm text-ink-2 space-y-1">
            <p><span className="text-mute">Catégorie :</span> {award.category}</p>
            {award.reason && <p><span className="text-mute">Raison :</span> {award.reason}</p>}
            {award.awarded_at && <p><span className="text-mute">Date :</span> {new Date(award.awarded_at).toLocaleString("fr-FR")}</p>}
          </div>
        </Card>
      ) : (
        <Card className="text-center py-14"><p className="text-mute">Attribution introuvable.</p></Card>
      )}
    </div>
  )
}

import type { Metadata } from "next"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Cake, Users, CalendarDays } from "lucide-react"

export const metadata: Metadata = { title: "Anniversaires — Partenaire" }
export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  completed: "Terminé",
}

// Refonte V1.5 (#101) + V3 (#196) — file des commandes d'anniversaire réelles.
// anniv_orders n'a pas de partner_id : le lien passe par le pack
// (anniv_packs.partner_id). On résout les packs du partenaire puis ses commandes.
export default async function PartnerAnniversairesPage() {
  const userInfo = await getUserRole()
  const partnerId = userInfo?.role === "partner" ? userInfo.partnerData?.id : null

  let orders: Array<Record<string, any>> = []
  const packNameById = new Map<string, string>()

  if (partnerId) {
    const sr = createServiceRoleClient()
    const { data: packs } = await sr
      .from("anniv_packs")
      .select("id, name")
      .eq("partner_id", partnerId)
    const packIds = (packs ?? []).map((p) => p.id as string)
    for (const p of packs ?? []) packNameById.set(p.id as string, (p.name as string) ?? "Pack")

    if (packIds.length > 0) {
      const { data } = await sr
        .from("anniv_orders")
        .select("id, teen_id, pack_id, party_date, guest_count, total_dh, status, created_at")
        .in("pack_id", packIds)
        .order("created_at", { ascending: false })
        .limit(50)
      orders = data ?? []
    }
  }

  return (
    <div className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Réservations</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <Cake className="w-8 h-8 text-pink" /> <span>Anni<em className="font-semibold italic text-pink">versaires</em></span>
        </h1>
        <p className="text-mute max-w-md">Les demandes de packs anniversaire sur tes formules.</p>
      </header>

      {orders.length === 0 ? (
        <NivEmpty
          mood="happy"
          title="Aucune demande pour l'instant"
          description="Dès qu'un ado réserve un pack anniversaire chez toi, sa demande débarque ici."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <StickerCard key={o.id} className="flex-row items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink">{packNameById.get(o.pack_id) ?? "Pack anniversaire"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-mute">
                  {o.party_date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {new Date(o.party_date).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {o.guest_count != null && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      {o.guest_count} invités
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono font-bold tabular-nums text-ink">{Number(o.total_dh ?? 0).toLocaleString("fr-FR")} DH</p>
                <span className="mt-1 inline-block rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-mute">
                  {STATUS_LABEL[o.status as string] ?? o.status}
                </span>
              </div>
            </StickerCard>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { StickerTabs } from "@/components/brand/sticker-tab"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

interface Transaction {
  id: string
  listing_id: string
  amount_coins: number
  amount_dh: number | null
  status: string
  meet_method: string
  created_at: string
}

// Libellés FR (présentation — valeurs serveur inchangées).
const STATUS_META: Record<string, { label: string; cls: string }> = {
  escrow: { label: "En cours", cls: "bg-gold text-ink" },
  completed: { label: "Terminée", cls: "bg-lime text-ink" },
  disputed: { label: "Litige", cls: "bg-coral text-ink" },
  refunded: { label: "Remboursée", cls: "bg-white text-ink" },
  cancelled: { label: "Annulée", cls: "bg-white text-mute" },
}

const MEET_LABELS: Record<string, string> = {
  school: "À l'école",
  venue_partner: "Partenaire Nivy",
  public_pickup: "Lieu public",
  shipping: "Livraison",
}

function TxCard({ tx }: { tx: Transaction }) {
  const meta = STATUS_META[tx.status] ?? { label: tx.status, cls: "bg-white text-ink" }
  return (
    <StickerCard variant="hover" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-bold tabular-nums text-coral">⊙ {tx.amount_coins}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
            {MEET_LABELS[tx.meet_method] ?? tx.meet_method} · {new Date(tx.created_at).toLocaleDateString("fr-FR")}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
            Réf #{tx.id.slice(0, 8)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${meta.cls}`}
        >
          {meta.label}
        </span>
      </div>
      <Link
        href={`/marketplace/listings/${tx.listing_id}`}
        className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink hover:text-pink"
      >
        Voir l'article
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </StickerCard>
  )
}

export function OrdersClient({
  bought,
  sold,
}: {
  bought: Transaction[]
  sold: Transaction[]
}) {
  const [tab, setTab] = useState<"bought" | "sold">("bought")
  const list = tab === "bought" ? bought : sold

  return (
    <div className="space-y-6">
      <StickerTabs
        ariaLabel="Filtrer mes commandes"
        value={tab}
        onValueChange={(v) => setTab(v as "bought" | "sold")}
        tabs={[
          { value: "bought", label: "Achats", badge: bought.length || undefined },
          { value: "sold", label: "Ventes", badge: sold.length || undefined },
        ]}
      />

      {list.length === 0 ? (
        tab === "bought" ? (
          <NivEmpty
            mood="calm"
            title="Aucun achat pour l'instant"
            description="Explore le marketplace et déniche une pépite près de chez toi."
            action={
              <Button asChild variant="pink">
                <Link href="/marketplace">Explorer le marketplace</Link>
              </Button>
            }
          />
        ) : (
          <NivEmpty
            mood="calm"
            title="Aucune vente pour l'instant"
            description="Mets un article en vente et fais ta première transaction."
            action={
              <Button asChild variant="pink">
                <Link href="/marketplace/sell">Vendre un article</Link>
              </Button>
            }
          />
        )
      ) : (
        <ul className="space-y-3">
          {list.map((t) => (
            <li key={t.id}>
              <TxCard tx={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

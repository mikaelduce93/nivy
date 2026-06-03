"use client"

import { useRouter } from "next/navigation"
import { StickerTabs } from "@/components/brand/sticker-tab"

const TABS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmées" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
]

/**
 * Onglets de filtre statut des commandes anniversaire (#177). Wrapper client
 * autour de `<StickerTabs>` (F6) : navigue vers `?status=` — même comportement
 * que les anciens `Tabs`/`Link asChild`, conservé iso-fonctionnellement.
 */
export function AnnivStatusTabs({ value }: { value: string }) {
  const router = useRouter()
  return (
    <StickerTabs
      ariaLabel="Filtrer les commandes par statut"
      value={value}
      onValueChange={(v) =>
        router.push(v === "all" ? "/admin/anniversaires" : `/admin/anniversaires?status=${v}`)
      }
      tabs={TABS}
    />
  )
}

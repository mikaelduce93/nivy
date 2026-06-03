"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { School, Store, AlertTriangle } from "lucide-react"

import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivCoach } from "@/components/brand"

const MEET_OPTIONS = [
  { value: "school", label: "À l'école", icon: School },
  { value: "venue_partner", label: "Partenaire Nivy", icon: Store },
] as const

export function BuyButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [meetMethod, setMeetMethod] = useState<"school" | "venue_partner">("school")
  const [msg, setMsg] = useState<string | null>(null)

  async function buy() {
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meet_method: meetMethod }),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.success) {
      setMsg(`Erreur : ${json.error}`)
      return
    }
    if (json.status === "pending_approval") {
      setMsg("Demande envoyée à ton parent pour approbation.")
      return
    }
    router.push("/marketplace/orders")
  }

  const isApproval = msg === "Demande envoyée à ton parent pour approbation."

  return (
    <StickerCard className="gap-4 p-5">
      <div>
        <span className="eyebrow tracking-[0.16em] text-mute">Lieu de rendez-vous</span>
        <p className="mt-1 text-sm text-mute">On choisit un endroit sûr pour l&apos;échange.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MEET_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = meetMethod === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMeetMethod(opt.value)}
              aria-pressed={active}
              className={`flex min-h-touch flex-col items-center gap-2 rounded-xl border-2 border-ink px-3 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-all ${
                active
                  ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                  : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {opt.label}
            </button>
          )
        })}
      </div>

      <NivCoach
        tone="paper"
        mood="calm"
        message="On organise toujours l'échange dans un lieu encadré. Jamais de coordonnées privées."
      />

      <Button onClick={buy} disabled={busy} variant="pink" size="lg" className="w-full shadow-stkr-md">
        {busy ? "Achat en cours…" : "Acheter"}
      </Button>

      {msg ? (
        isApproval ? (
          <div className="rounded-2xl border-2 border-ink bg-teal/15 p-4 shadow-stkr-sm">
            <p className="text-sm font-medium text-ink">{msg}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-coral/15 p-4 shadow-stkr-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{msg}</p>
          </div>
        )
      ) : null}
    </StickerCard>
  )
}

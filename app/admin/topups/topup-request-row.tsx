"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"

interface ProfileLite {
  full_name: string | null
  email?: string | null
  phone?: string | null
}

interface TopupRequest {
  id: string
  parent_id: string
  teen_id: string
  amount_dh: number | string
  provider: string
  provider_ref: string
  screenshot_path: string | null
  status: string
  payment_transaction_id: string | null
  rejection_reason: string | null
  decided_at: string | null
  created_at: string
  parent: ProfileLite | null
  teen: ProfileLite | null
}

export function TopupRequestRow({ request }: { request: TopupRequest }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  async function decide(action: "confirm" | "reject") {
    setBusy(action)
    setError(null)
    try {
      const res = await fetchWithCSRF(`/api/admin/topups/${request.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? reason || "no_reason_given" : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? "Erreur inconnue")
        setBusy(null)
        return
      }
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Erreur réseau")
      setBusy(null)
    }
  }

  const created = new Date(request.created_at).toLocaleString("fr-FR")
  const isPending = request.status === "pending"

  return (
    <StickerCard className="p-5">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto]">
        <div>
          <p className="text-sm text-mute">{created}</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            <span className="font-mono tabular-nums">{Number(request.amount_dh).toFixed(2)} DH</span>
            <span className="ml-2 font-mono text-xs uppercase tracking-[0.16em] text-mute">
              {request.provider}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Parent : {request.parent?.full_name ?? request.parent_id}
            {request.parent?.phone ? ` (${request.parent.phone})` : ""}
          </p>
          <p className="text-sm text-ink-2">
            Teen : {request.teen?.full_name ?? request.teen_id}
          </p>
          <p className="mt-1 text-xs text-mute">
            Réf. PSP : <code className="rounded-md border-2 border-ink bg-paper px-1 font-mono">{request.provider_ref}</code>
          </p>
          {request.screenshot_path && (
            <p className="mt-1 text-xs text-mute">
              Justificatif : <code className="font-mono">{request.screenshot_path}</code>
            </p>
          )}
          {request.rejection_reason && (
            <p className="mt-2 text-sm text-pink">
              Motif rejet : {request.rejection_reason}
            </p>
          )}
          {request.payment_transaction_id && (
            <p className="mt-2 text-xs text-lime">
              Payment id : <code className="font-mono">{request.payment_transaction_id}</code>
            </p>
          )}
        </div>

        {isPending && (
          <div>
            <label className="block font-mono text-xs uppercase tracking-[0.16em] text-mute">
              Motif (si rejet)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
              placeholder="ex. justificatif illisible"
            />
          </div>
        )}

        {isPending && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant="lime"
              disabled={busy !== null}
              onClick={() => decide("confirm")}
            >
              {busy === "confirm" ? "..." : "Confirmer & créditer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={busy !== null}
              onClick={() => decide("reject")}
            >
              {busy === "reject" ? "..." : "Rejeter"}
            </Button>
            {error && <p className="text-xs text-pink">{error}</p>}
          </div>
        )}
      </div>
    </StickerCard>
  )
}

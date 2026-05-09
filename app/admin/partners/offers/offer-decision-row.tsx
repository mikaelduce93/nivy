"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

interface OfferLite {
  id: string
  title: string
  description: string | null
  offer_type: string | null
  discount_value: number | string | null
  discount_type: string | null
  min_purchase_amount: number | string | null
  max_discount_amount: number | string | null
  valid_from: string | null
  valid_until: string | null
  status: string
  is_active: boolean
  created_at: string
}

interface PartnerLite {
  id: string
  company_name: string
  partner_type: string
}

export function OfferDecisionRow({
  offer,
  partner,
}: {
  offer: OfferLite
  partner: PartnerLite | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: "approved" | "rejected") {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partners/offers/${offer.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "rejected" ? reason.trim() || null : null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        setError(typeof j?.error === "string" ? j.error : "Erreur de décision")
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const valueStr =
    offer.discount_value != null
      ? `${offer.discount_value}${offer.discount_type === "percentage" || offer.discount_type == null ? "%" : " DH"}`
      : ""

  return (
    <li className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-white">{offer.title}</div>
          <div className="text-xs text-zinc-500">
            {partner?.company_name ?? "Partenaire inconnu"}
            {partner ? ` · ${partner.partner_type}` : ""}
            {valueStr ? ` · ${valueStr}` : ""}
            {offer.offer_type ? ` · ${offer.offer_type}` : ""}
          </div>
          {offer.description && (
            <div className="mt-1 text-sm text-zinc-300 line-clamp-2">{offer.description}</div>
          )}
          <div className="mt-1 text-xs text-zinc-600">
            Soumis le {new Date(offer.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
          {offer.status}
        </span>
      </header>

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (optionnel mais recommandé)"
            rows={2}
            maxLength={500}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("approved")}
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="mr-1 inline h-3 w-3" />
          Approuver (active)
        </button>
        {!showReject ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="mr-1 inline h-3 w-3" />
            Rejeter
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("rejected")}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirmer le rejet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
              className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </li>
  )
}

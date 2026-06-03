"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"

const OFFER_STATUS_VARIANT: Record<string, StatusVariant> = {
  pending: "pending",
  approved: "success",
  active: "success",
  rejected: "danger",
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  active: "Active",
  rejected: "Rejetée",
}

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
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink">{offer.title}</div>
          <div className="text-xs text-mute">
            {partner?.company_name ?? "Partenaire inconnu"}
            {partner ? ` · ${partner.partner_type}` : ""}
            {valueStr ? <> · <span className="font-mono">{valueStr}</span></> : null}
            {offer.offer_type ? ` · ${offer.offer_type}` : ""}
          </div>
          {offer.description && (
            <div className="mt-1 text-sm text-ink-2 line-clamp-2">{offer.description}</div>
          )}
          <div className="mt-1 text-xs text-mute">
            Soumis le {new Date(offer.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <StatusBadge
          variant={OFFER_STATUS_VARIANT[offer.status] ?? "neutral"}
          label={OFFER_STATUS_LABEL[offer.status] ?? offer.status}
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (optionnel mais recommandé)"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="lime"
          disabled={busy}
          onClick={() => decide("approved")}
        >
          <Check className="mr-1 inline h-3 w-3" />
          Approuver (active)
        </Button>
        {!showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => setShowReject(true)}
          >
            <X className="mr-1 inline h-3 w-3" />
            Rejeter
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => decide("rejected")}
            >
              Confirmer le rejet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
            >
              Annuler
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

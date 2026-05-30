"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface PartnerLite {
  id: string
  company_name: string
  partner_type: string
  sub_category: string | null
  email: string
  status: string
  created_at: string
}

interface DocLite {
  id: string
  doc_type: string
  status: string
  subject_kind: string | null
  signedUrl: string | null
}

export function PartnerReviewRow({
  partner,
  documents,
}: {
  partner: PartnerLite
  documents: DocLite[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [activateOutcome, setActivateOutcome] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur d'approbation")
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  // Wave 3A.5 — canonical atomic activation. Provisions the auth user via
  // inviteUserByEmail, upserts partner_staff (role='owner'), flips
  // partners.status='active', writes audit_log. Idempotent.
  async function activate() {
    setBusy(true)
    setError(null)
    setActivateOutcome(null)
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        if (j?.error === "kyc_not_approved") {
          setError(
            `Documents KYC requis. ${j?.details?.docs_approved ?? 0}/${j?.details?.docs_total ?? 0} approuvés.`,
          )
        } else {
          setError(typeof j?.error === "string" ? j.error : "Erreur d'activation")
        }
        return
      }
      if (j.outcome === "noop_already_active") {
        setActivateOutcome("Déjà actif")
      } else {
        setActivateOutcome(j.provisioned === "created" ? "Activé · invitation envoyée" : "Activé")
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError("Indiquez un motif de rejet.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de rejet")
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const verifiedCount = documents.filter((d) => d.status === "approved").length

  return (
    <li className="rounded border border-ink bg-card p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink">{partner.company_name}</div>
          <div className="text-xs text-mute">
            {partner.partner_type}
            {partner.sub_category ? ` · ${partner.sub_category}` : ""} · {partner.email}
          </div>
          <div className="text-xs text-mute">
            Inscrit le {new Date(partner.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            partner.status === "in_review"
              ? "bg-teal/20 text-teal"
              : "bg-gold/20 text-gold"
          }`}
        >
          {partner.status === "in_review" ? "En révision" : "En attente"}
        </span>
      </header>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-mute">
          <span>Documents KYC</span>
          <span>
            {verifiedCount}/{documents.length} approuvés
          </span>
        </div>
        {documents.length === 0 ? (
          <div className="rounded bg-background px-3 py-2 text-xs text-mute">
            Aucun document soumis.
          </div>
        ) : (
          <ul className="space-y-1">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded bg-background px-3 py-2 text-xs"
              >
                <span className="text-ink-2">
                  {d.doc_type}
                  {d.subject_kind ? (
                    <span className="ml-2 text-mute">({d.subject_kind})</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      d.status === "approved"
                        ? "text-lime"
                        : d.status === "rejected"
                          ? "text-destructive"
                          : "text-gold"
                    }
                  >
                    {d.status}
                  </span>
                  {d.signedUrl ? (
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal underline-offset-4 hover:underline"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className="text-mute">URL indisponible</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded border border-ink bg-background p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
      {activateOutcome && (
        <p className="mb-2 text-xs text-lime">{activateOutcome}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={activate}
          className="rounded bg-lime px-3 py-1 text-sm font-bold text-ink hover:bg-lime disabled:opacity-50"
          title="Provisionne l'auth.user, partner_staff owner, status=active. Idempotent."
        >
          Activer
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={approve}
          className="rounded bg-lime px-3 py-1 text-sm text-ink hover:bg-lime disabled:opacity-50"
          title="Marque KYC approuvé (legacy). Préférer Activer."
        >
          Approuver
        </button>
        {!showReject ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded bg-destructive px-3 py-1 text-sm text-ink hover:bg-destructive disabled:opacity-50"
          >
            Rejeter
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="rounded bg-destructive px-3 py-1 text-sm text-ink hover:bg-destructive disabled:opacity-50"
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
              className="rounded bg-muted px-3 py-1 text-sm text-ink hover:bg-muted disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </li>
  )
}

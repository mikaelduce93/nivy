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
    <li className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-white">{partner.company_name}</div>
          <div className="text-xs text-zinc-500">
            {partner.partner_type}
            {partner.sub_category ? ` · ${partner.sub_category}` : ""} · {partner.email}
          </div>
          <div className="text-xs text-zinc-600">
            Inscrit le {new Date(partner.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            partner.status === "in_review"
              ? "bg-blue-500/20 text-blue-300"
              : "bg-yellow-500/20 text-yellow-300"
          }`}
        >
          {partner.status === "in_review" ? "En révision" : "En attente"}
        </span>
      </header>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
          <span>Documents KYC</span>
          <span>
            {verifiedCount}/{documents.length} approuvés
          </span>
        </div>
        {documents.length === 0 ? (
          <div className="rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
            Aucun document soumis.
          </div>
        ) : (
          <ul className="space-y-1">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded bg-zinc-950 px-3 py-2 text-xs"
              >
                <span className="text-zinc-300">
                  {d.doc_type}
                  {d.subject_kind ? (
                    <span className="ml-2 text-zinc-500">({d.subject_kind})</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      d.status === "approved"
                        ? "text-green-400"
                        : d.status === "rejected"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }
                  >
                    {d.status}
                  </span>
                  {d.signedUrl ? (
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline-offset-4 hover:underline"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className="text-zinc-600">URL indisponible</span>
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
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={approve}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approuver
        </button>
        {!showReject ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Rejeter
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={reject}
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

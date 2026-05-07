"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DocLite {
  id: string
  doc_type: string
  status: string
  signedUrl: string | null
}

interface MentorView {
  id: string
  user_id: string | null
  full_name: string | null
  email: string | null
  expertise_tags: string[]
  years_experience: number | null
  bio: string | null
  hourly_rate_dh: number | null
  age_min_mentee: number | null
  age_max_mentee: number | null
  status: string
  kyc_status: string
  rating: number | null
  sessions_count: number
  created_at: string
  documents: DocLite[]
}

export function MentorReviewRow({
  mentor,
  actionable,
}: {
  mentor: MentorView
  actionable: boolean
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
      const res = await fetch(`/api/admin/mentors/${mentor.id}/approve`, {
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
      const res = await fetch(`/api/admin/mentors/${mentor.id}/reject`, {
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

  const verifiedCount = mentor.documents.filter((d) => d.status === "approved").length
  const ageRange =
    mentor.age_min_mentee != null && mentor.age_max_mentee != null
      ? `${mentor.age_min_mentee}-${mentor.age_max_mentee} ans`
      : "—"

  return (
    <li className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-white">
            {mentor.full_name ?? "Sans nom"}
          </div>
          <div className="text-xs text-zinc-500">
            {mentor.email ?? "(email inconnu)"}
            {mentor.years_experience != null
              ? ` · ${mentor.years_experience} ans d'exp.`
              : ""}
          </div>
          <div className="text-xs text-zinc-600">
            Inscrit le {new Date(mentor.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              mentor.kyc_status === "approved"
                ? "bg-green-500/20 text-green-300"
                : mentor.kyc_status === "rejected"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            KYC: {mentor.kyc_status}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              mentor.status === "active"
                ? "bg-green-500/20 text-green-300"
                : mentor.status === "rejected" || mentor.status === "suspended"
                  ? "bg-red-500/20 text-red-300"
                  : mentor.status === "paused"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            Statut: {mentor.status}
          </span>
        </div>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Field label="Tarif">
          {mentor.hourly_rate_dh != null ? `${mentor.hourly_rate_dh} DH/h` : "—"}
        </Field>
        <Field label="Tranche d'âge">{ageRange}</Field>
        <Field label="Sessions">{mentor.sessions_count}</Field>
        <Field label="Note">
          {mentor.rating != null ? mentor.rating.toFixed(2) : "—"}
        </Field>
      </div>

      {mentor.expertise_tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {mentor.expertise_tags.map((t) => (
            <span
              key={t}
              className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {mentor.bio && (
        <p className="mb-3 line-clamp-3 rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          {mentor.bio}
        </p>
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
          <span>Documents KYC</span>
          <span>
            {verifiedCount}/{mentor.documents.length} approuvés
          </span>
        </div>
        {mentor.documents.length === 0 ? (
          <div className="rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
            Aucun document soumis.
          </div>
        ) : (
          <ul className="space-y-1">
            {mentor.documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded bg-zinc-950 px-3 py-2 text-xs"
              >
                <span className="text-zinc-300">{d.doc_type}</span>
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

      {actionable && showReject && (
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

      {actionable && (
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
      )}
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded bg-zinc-950 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-zinc-200">{children}</div>
    </div>
  )
}

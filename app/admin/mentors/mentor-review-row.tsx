"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"

function kycVariant(status: string): StatusVariant {
  switch (status) {
    case "approved":
      return "success"
    case "rejected":
      return "danger"
    case "pending":
      return "pending"
    default:
      return "neutral"
  }
}

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case "active":
      return "success"
    case "rejected":
    case "suspended":
      return "danger"
    case "paused":
      return "info"
    default:
      return "pending"
  }
}

function docVariant(status: string): StatusVariant {
  switch (status) {
    case "approved":
      return "success"
    case "rejected":
      return "danger"
    default:
      return "warning"
  }
}

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
    <li className="rounded border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-foreground">
            {mentor.full_name ?? "Sans nom"}
          </div>
          <div className="text-xs text-muted-foreground">
            {mentor.email ?? "(email inconnu)"}
            {mentor.years_experience != null
              ? ` · ${mentor.years_experience} ans d'exp.`
              : ""}
          </div>
          <div className="text-xs text-muted-foreground/80">
            Inscrit le {new Date(mentor.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge
            variant={kycVariant(mentor.kyc_status)}
            label={`KYC : ${mentor.kyc_status}`}
            size="sm"
          />
          <StatusBadge
            variant={statusVariant(mentor.status)}
            label={`Statut : ${mentor.status}`}
            size="sm"
          />
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
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {mentor.bio && (
        <p className="mb-3 line-clamp-3 rounded bg-background px-3 py-2 text-xs text-foreground/90">
          {mentor.bio}
        </p>
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Documents KYC</span>
          <span>
            {verifiedCount}/{mentor.documents.length} approuvés
          </span>
        </div>
        {mentor.documents.length === 0 ? (
          <div className="rounded bg-background px-3 py-2 text-xs text-muted-foreground">
            Aucun document soumis.
          </div>
        ) : (
          <ul className="space-y-1">
            {mentor.documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded bg-background px-3 py-2 text-xs"
              >
                <span className="text-foreground/90">{d.doc_type}</span>
                <span className="flex items-center gap-3">
                  <StatusBadge
                    variant={docVariant(d.status)}
                    label={d.status}
                    size="sm"
                  />
                  {d.signedUrl ? (
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-info underline-offset-4 hover:underline"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className="text-muted-foreground/70">URL indisponible</span>
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
            className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      {actionable && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={approve}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            Approuver
          </Button>
          {!showReject ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setShowReject(true)}
            >
              Rejeter
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={reject}
              >
                Confirmer le rejet
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
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
      )}
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded bg-background px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground/90">{children}</div>
    </div>
  )
}

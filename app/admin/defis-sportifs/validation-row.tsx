"use client"

/**
 * Audit 2026-07-11 D3 — one pending physical-challenge submission in the
 * admin validation queue. Approve / Reject wired on the existing endpoint
 * POST /api/admin/sport-challenges/:id/validate (id = progress row id).
 * Same interaction pattern as app/admin/proofs/moderation-review-row.tsx.
 */

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"

export interface SportChallengeRow {
  id: string
  completed_at: string | null
  current_value: number | null
  objective_value: number
  proof_type: string | null
  proofSignedUrl: string | null
  teenLabel: string
  challengeName: string
  challengeMeta: string | null
  xpReward: number
  objectiveUnit: string | null
}

export function SportChallengeValidationRow({ row }: { row: SportChallengeRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function callValidate(action: "approve" | "reject") {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sport-challenges/${row.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "reject" ? { action, reason: reason.trim() } : { action }
        ),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        setError(typeof j.error === "string" ? j.error : "Erreur de validation")
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function reject() {
    if (!reason.trim()) {
      setError("Indiquez un motif de rejet.")
      return
    }
    void callValidate("reject")
  }

  const isVideo =
    row.proof_type === "video" ||
    (row.proofSignedUrl ? /\.(mp4|webm|mov)(\?|$)/i.test(row.proofSignedUrl) : false)

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
            Défi physique · +{row.xpReward} XP
          </div>
          <div className="font-semibold text-ink">{row.challengeName}</div>
          <div className="text-xs text-mute">
            {row.challengeMeta ? <>{row.challengeMeta} · </> : null}
            Par <span className="font-semibold text-ink-2">{row.teenLabel}</span>
            {row.completed_at
              ? ` · soumis le ${new Date(row.completed_at).toLocaleString("fr-FR")}`
              : null}
          </div>
          <div className="mt-0.5 font-mono text-xs text-mute">
            Progression : {row.current_value ?? 0}/{row.objective_value}
            {row.objectiveUnit ? ` ${row.objectiveUnit}` : ""}
          </div>
        </div>
        <StatusBadge
          variant="pending"
          label="En attente"
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      {row.proofSignedUrl ? (
        <div className="mb-3">
          {isVideo ? (
            <video
              src={row.proofSignedUrl}
              controls
              className="aspect-video w-full max-w-md rounded bg-ink object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded bg-background">
              <Image
                src={row.proofSignedUrl}
                alt={`Preuve soumise pour ${row.challengeName}`}
                fill
                sizes="(max-width: 640px) 100vw, 448px"
                className="object-contain"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="mb-3 rounded-lg border-2 border-ink bg-paper p-3 text-sm text-mute">
          Preuve introuvable (URL non signable) — rejeter pour que l&apos;ado soumette à nouveau.
        </p>
      )}

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (obligatoire)"
            rows={2}
            maxLength={1000}
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
          onClick={() => void callValidate("approve")}
        >
          Valider (+{row.xpReward} XP)
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

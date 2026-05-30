"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { Check, X, AlertTriangle, RotateCcw } from "lucide-react"

interface QueueRow {
  id: string
  content_type: string
  content_id: string | null
  status: string
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  payload: Record<string, unknown> | null
}

const DESTRUCTIVE: ReadonlySet<string> = new Set(["delete", "warn", "suspend"])

const STATUS_VARIANT: Record<string, StatusVariant> = {
  pending: "pending",
  approved: "success",
  escalated: "info",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  escalated: "Escaladé",
  rejected: "Rejeté",
}

export function ModerationDecisionRow({
  row,
  contentLabel,
  supported,
  reportCount,
}: {
  row: QueueRow
  contentLabel: string
  supported: boolean
  reportCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: string) {
    if (DESTRUCTIVE.has(decision) && !reason.trim() && pendingDecision !== decision) {
      // First click on a destructive action without a reason: open the
      // reason field instead of submitting.
      setPendingDecision(decision)
      setError("Motif requis.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/moderation/${row.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        if (json?.error === "unsupported_action" || json?.error === "unsupported_content_type") {
          setError(`Action non supportée pour ce type (${row.content_type}).`)
        } else if (json?.error === "already_reviewed") {
          setError("Déjà actionné.")
        } else {
          setError(typeof json?.error === "string" ? json.error : `HTTP ${res.status}`)
        }
        return
      }
      setReason("")
      setPendingDecision(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const isPending = row.status === "pending"

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink text-sm">
            {contentLabel}
            {!supported && (
              <span className="ml-2 text-xs text-gold">type non supporté</span>
            )}
          </p>
          <p className="text-xs text-mute font-mono mt-1 truncate">
            {row.content_id ?? "—"}
          </p>
          <p className="text-xs text-mute mt-1">
            Soumis le {new Date(row.created_at).toLocaleString("fr-FR")}
            {reportCount > 0 ? ` · ${reportCount} signalement${reportCount > 1 ? "s" : ""}` : ""}
            {row.reason ? ` · raison initiale: ${row.reason}` : ""}
          </p>
        </div>
        <StatusBadge
          variant={STATUS_VARIANT[row.status] ?? "danger"}
          label={STATUS_LABEL[row.status] ?? row.status}
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      {row.payload && (
        <details className="mb-3">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.16em] text-mute">
            Payload
          </summary>
          <pre className="mt-2 text-xs text-mute bg-paper rounded-lg border-2 border-ink p-2 max-h-32 overflow-auto font-mono">
            {JSON.stringify(row.payload, null, 2)}
          </pre>
        </details>
      )}

      {isPending && supported && (
        <>
          {(pendingDecision && DESTRUCTIVE.has(pendingDecision)) && (
            <div className="mb-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Motif obligatoire pour: ${pendingDecision}`}
                rows={2}
                maxLength={1000}
                className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
              />
            </div>
          )}

          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="lime"
              disabled={busy}
              onClick={() => decide("dismiss")}
              title="Pas de violation — restaure / approuve."
            >
              <Check className="w-3 h-3 mr-1" />
              Rejeter le signalement
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("hide")}
            >
              Masquer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("delete")}
              className="text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Supprimer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("escalate")}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Escalader
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("warn")}
              className="text-gold"
              title="Avertit l'auteur. Wave 4A.2 — branche le notify."
            >
              Avertir
            </Button>
          </div>
        </>
      )}

      {!isPending && (
        <div className="text-xs text-mute">
          Actionné{row.reviewed_at ? ` le ${new Date(row.reviewed_at).toLocaleString("fr-FR")}` : ""}
          {row.reason ? ` · ${row.reason}` : ""}
        </div>
      )}

      {isPending && !supported && (
        <div className="text-xs text-gold flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          Pas d&apos;adapter pour ce content_type. La décision renverra 409 unsupported_action.
        </div>
      )}

      {!isPending && row.status === "approved" && (
        <RotateCcw className="hidden" />
      )}
    </li>
  )
}

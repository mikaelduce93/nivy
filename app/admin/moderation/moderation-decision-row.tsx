"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    <li className="rounded border border-ink bg-card p-4">
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
            {reportCount > 0 ? ` · ${reportCount} report${reportCount > 1 ? "s" : ""}` : ""}
            {row.reason ? ` · raison initiale: ${row.reason}` : ""}
          </p>
        </div>
        <Badge
          className={
            row.status === "pending"
              ? "bg-gold/20 text-gold"
              : row.status === "approved"
              ? "bg-lime/20 text-lime"
              : row.status === "escalated"
              ? "bg-teal/20 text-teal"
              : "bg-destructive/20 text-destructive"
          }
        >
          {row.status}
        </Badge>
      </header>

      {row.payload && (
        <pre className="text-xs text-mute bg-background rounded p-2 max-h-32 overflow-auto mb-3">
          {JSON.stringify(row.payload, null, 2)}
        </pre>
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
                className="w-full rounded border border-ink bg-background p-2 text-sm text-ink"
              />
            </div>
          )}

          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => decide("dismiss")}
              className="bg-lime hover:bg-lime text-ink"
              title="Pas de violation — restaure / approuve."
            >
              <Check className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("hide")}
            >
              Hide
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("delete")}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <X className="w-3 h-3 mr-1" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("escalate")}
              className="text-teal border-teal/40 hover:bg-teal/10"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Escalate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("warn")}
              className="text-gold border-gold/40 hover:bg-gold/10"
              title="Avertit l'auteur. Wave 4A.2 — branche le notify."
            >
              Warn
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

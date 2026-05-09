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
    <li className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-white text-sm">
            {contentLabel}
            {!supported && (
              <span className="ml-2 text-xs text-amber-300">type non supporté</span>
            )}
          </p>
          <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
            {row.content_id ?? "—"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Soumis le {new Date(row.created_at).toLocaleString("fr-FR")}
            {reportCount > 0 ? ` · ${reportCount} report${reportCount > 1 ? "s" : ""}` : ""}
            {row.reason ? ` · raison initiale: ${row.reason}` : ""}
          </p>
        </div>
        <Badge
          className={
            row.status === "pending"
              ? "bg-amber-500/20 text-amber-300"
              : row.status === "approved"
              ? "bg-emerald-500/20 text-emerald-300"
              : row.status === "escalated"
              ? "bg-blue-500/20 text-blue-300"
              : "bg-red-500/20 text-red-300"
          }
        >
          {row.status}
        </Badge>
      </header>

      {row.payload && (
        <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-2 max-h-32 overflow-auto mb-3">
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
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
              />
            </div>
          )}

          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => decide("dismiss")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              className="text-red-300 border-red-500/40 hover:bg-red-500/10"
            >
              <X className="w-3 h-3 mr-1" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("escalate")}
              className="text-blue-300 border-blue-500/40 hover:bg-blue-500/10"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Escalate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide("warn")}
              className="text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
              title="Avertit l'auteur. Wave 4A.2 — branche le notify."
            >
              Warn
            </Button>
          </div>
        </>
      )}

      {!isPending && (
        <div className="text-xs text-zinc-500">
          Actionné{row.reviewed_at ? ` le ${new Date(row.reviewed_at).toLocaleString("fr-FR")}` : ""}
          {row.reason ? ` · ${row.reason}` : ""}
        </div>
      )}

      {isPending && !supported && (
        <div className="text-xs text-amber-300 flex items-center gap-2">
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

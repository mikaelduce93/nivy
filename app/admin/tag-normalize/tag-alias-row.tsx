"use client"

/**
 * Polish-E — single row of the /admin/tag-normalize queue.
 *
 * Three actions per alias:
 *   1. Alias to existing canonical → POST { action: 'approve_existing' }
 *   2. Add new canonical to taxonomy + alias → POST { action: 'approve_new' }
 *   3. Reject → POST { action: 'reject' }
 *
 * If the alias already has a tag_aliases row, we display its current
 * status/canonical and allow re-deciding.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"

const ALIAS_STATUS_VARIANT: Record<string, StatusVariant> = {
  approved: "success",
  rejected: "danger",
  pending: "pending",
}

const ALIAS_STATUS_LABEL: Record<string, string> = {
  approved: "Approuvé",
  rejected: "Rejeté",
  pending: "En attente",
}

interface Props {
  alias: string
  count: number
  tables: string[]
  existingStatus: "pending" | "approved" | "rejected" | null
  existingCanonical: string | null
  suggestedCanonical: string | null
  taxonomy: string[]
}

type Mode = null | "alias_existing" | "add_new"

export function TagAliasRow({
  alias,
  count,
  tables,
  existingStatus,
  existingCanonical,
  suggestedCanonical,
  taxonomy,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>(null)
  const [canonical, setCanonical] = useState<string>(
    existingCanonical && taxonomy.includes(existingCanonical)
      ? existingCanonical
      : (suggestedCanonical ?? taxonomy[0] ?? ""),
  )
  const [newTag, setNewTag] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/tag-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }
      if (!res.ok || !j.success) {
        setError(typeof j.error === "string" ? j.error : `HTTP ${res.status}`)
        return
      }
      setDone(`OK (${String(payload.action)})`)
      setMode(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error")
    } finally {
      setBusy(false)
    }
  }

  const statusBadge = existingStatus ? (
    <StatusBadge
      variant={ALIAS_STATUS_VARIANT[existingStatus] ?? "neutral"}
      label={`${ALIAS_STATUS_LABEL[existingStatus] ?? existingStatus}${existingCanonical ? ` → ${existingCanonical}` : ""}`}
      size="sm"
      className="font-mono uppercase tracking-[0.16em]"
    />
  ) : null

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white p-3 text-sm text-ink-2 shadow-stkr-md">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-xs text-ink-2">
            {alias}
          </code>
          <span className="font-mono text-xs text-mute">×{count}</span>
          <span className="text-xs text-mute">
            ({tables.join(", ") || "—"})
          </span>
          {statusBadge}
        </div>
        {suggestedCanonical && !existingStatus && (
          <span className="text-xs text-mute">
            suggéré: <code className="text-ink-2">{suggestedCanonical}</code>
          </span>
        )}
      </header>

      {mode === "alias_existing" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-mute">
            Canonique existant
            <select
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              className="rounded-lg border-2 border-ink bg-paper px-2 py-1 text-sm text-ink"
            >
              {taxonomy.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            variant="lime"
            disabled={busy || !canonical}
            onClick={() =>
              submit({
                alias,
                action: "approve_existing",
                canonical_tag: canonical,
              })
            }
          >
            Confirmer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setMode(null)}
          >
            Annuler
          </Button>
        </div>
      )}

      {mode === "add_new" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-mute">
            Nouveau tag canonique (snake_case)
            <input
              type="text"
              value={newTag}
              onChange={(e) =>
                setNewTag(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 64),
                )
              }
              placeholder="ex: lifestyle_skating"
              className="rounded-lg border-2 border-ink bg-paper px-2 py-1 font-mono text-sm text-ink"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="mint"
            disabled={busy || !/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(newTag)}
            onClick={() =>
              submit({
                alias,
                action: "approve_new",
                canonical_tag: newTag,
              })
            }
          >
            Ajouter et mapper
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setMode(null)}
          >
            Annuler
          </Button>
        </div>
      )}

      {!mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="lime"
            disabled={busy}
            onClick={() => setMode("alias_existing")}
          >
            Aliaser à existant
          </Button>
          <Button
            type="button"
            size="sm"
            variant="mint"
            disabled={busy}
            onClick={() => setMode("add_new")}
          >
            Ajouter à la taxonomie
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => submit({ alias, action: "reject" })}
          >
            Rejeter
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">Erreur: {error}</p>}
      {done && !error && (
        <p className="mt-2 text-xs text-lime">{done}</p>
      )}
    </li>
  )
}

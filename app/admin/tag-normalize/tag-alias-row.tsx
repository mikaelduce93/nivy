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
    <span
      className={`rounded px-2 py-0.5 text-xs ${
        existingStatus === "approved"
          ? "bg-lime/20 text-lime"
          : existingStatus === "rejected"
            ? "bg-destructive/20 text-destructive"
            : "bg-gold/20 text-gold"
      }`}
    >
      {existingStatus}
      {existingCanonical ? ` → ${existingCanonical}` : ""}
    </span>
  ) : null

  return (
    <li className="rounded border border-ink bg-card p-3 text-sm text-ink-2">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-background px-2 py-0.5 font-mono text-xs text-ink-2">
            {alias}
          </code>
          <span className="text-xs text-mute">×{count}</span>
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
              className="rounded border border-ink bg-background px-2 py-1 text-sm text-ink"
            >
              {taxonomy.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !canonical}
            onClick={() =>
              submit({
                alias,
                action: "approve_existing",
                canonical_tag: canonical,
              })
            }
            className="rounded bg-lime px-3 py-1 text-sm text-ink hover:bg-lime disabled:opacity-50"
          >
            Confirmer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(null)}
            className="rounded bg-muted px-3 py-1 text-sm text-ink hover:bg-muted disabled:opacity-50"
          >
            Annuler
          </button>
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
              className="rounded border border-ink bg-background px-2 py-1 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="button"
            disabled={busy || !/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(newTag)}
            onClick={() =>
              submit({
                alias,
                action: "approve_new",
                canonical_tag: newTag,
              })
            }
            className="rounded bg-teal px-3 py-1 text-sm text-ink hover:bg-teal disabled:opacity-50"
          >
            Ajouter et mapper
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(null)}
            className="rounded bg-muted px-3 py-1 text-sm text-ink hover:bg-muted disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {!mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("alias_existing")}
            className="rounded bg-lime px-3 py-1 text-xs text-ink hover:bg-lime disabled:opacity-50"
          >
            Aliaser à existant
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("add_new")}
            className="rounded bg-teal px-3 py-1 text-xs text-ink hover:bg-teal disabled:opacity-50"
          >
            Ajouter à la taxonomie
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit({ alias, action: "reject" })}
            className="rounded bg-destructive px-3 py-1 text-xs text-ink hover:bg-destructive disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">Erreur: {error}</p>}
      {done && !error && (
        <p className="mt-2 text-xs text-lime">{done}</p>
      )}
    </li>
  )
}

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
          ? "bg-green-500/20 text-green-300"
          : existingStatus === "rejected"
            ? "bg-red-500/20 text-red-300"
            : "bg-yellow-500/20 text-yellow-300"
      }`}
    >
      {existingStatus}
      {existingCanonical ? ` → ${existingCanonical}` : ""}
    </span>
  ) : null

  return (
    <li className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-zinc-950 px-2 py-0.5 font-mono text-xs text-zinc-100">
            {alias}
          </code>
          <span className="text-xs text-zinc-400">×{count}</span>
          <span className="text-xs text-zinc-500">
            ({tables.join(", ") || "—"})
          </span>
          {statusBadge}
        </div>
        {suggestedCanonical && !existingStatus && (
          <span className="text-xs text-zinc-500">
            suggéré: <code className="text-zinc-300">{suggestedCanonical}</code>
          </span>
        )}
      </header>

      {mode === "alias_existing" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Canonique existant
            <select
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-white"
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
            className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            Confirmer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(null)}
            className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {mode === "add_new" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
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
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-white"
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
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Ajouter et mapper
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode(null)}
            className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
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
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
          >
            Aliaser à existant
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("add_new")}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Ajouter à la taxonomie
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit({ alias, action: "reject" })}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">Erreur: {error}</p>}
      {done && !error && (
        <p className="mt-2 text-xs text-green-400">{done}</p>
      )}
    </li>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface PartnerOption {
  id: string
  company_name: string
}

/**
 * New-internship form.
 * Calls POST /api/admin/internships with:
 *   { title, description, city, remote_ok, age_min, age_max, spots_total, partner_id }
 *
 * Migration 066 added `city` (text NULL) and `remote_ok` (boolean DEFAULT false)
 * to the `internships` table — these now persist directly.
 */
export function InternshipForm({ partners }: { partners: PartnerOption[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [city, setCity] = useState("")
  const [remoteOk, setRemoteOk] = useState(false)
  const [ageMin, setAgeMin] = useState(14)
  const [ageMax, setAgeMax] = useState(17)
  const [spotsTotal, setSpotsTotal] = useState(1)
  const [partnerId, setPartnerId] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (!title.trim()) {
      setError("Titre requis.")
      return
    }
    if (!partnerId) {
      setError("Sélectionnez un partenaire.")
      return
    }
    if (ageMin < 13 || ageMax > 18 || ageMin > ageMax) {
      setError("Tranche d'âge invalide (13–18, min ≤ max).")
      return
    }
    if (spotsTotal < 1) {
      setError("Au moins une place requise.")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/admin/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          city: city.trim() || null,
          remote_ok: remoteOk,
          age_min: ageMin,
          age_max: ageMax,
          spots_total: spotsTotal,
          partner_id: partnerId,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur lors de la création")
        return
      }
      setOk(true)
      setTitle("")
      setDescription("")
      setCity("")
      setRemoteOk(false)
      setAgeMin(14)
      setAgeMax(17)
      setSpotsTotal(1)
      setPartnerId("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Label text="Titre">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>

        <Label text="Partenaire">
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          >
            <option value="">— sélectionner —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name}
              </option>
            ))}
          </select>
        </Label>

        <Label text="Ville">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={120}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={remoteOk}
            onChange={(e) => setRemoteOk(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-600"
          />
          <span className="text-xs uppercase tracking-wide text-zinc-300">
            Possible à distance
          </span>
        </label>

        <Label text="Description" full>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>

        <Label text="Âge min (13–18)">
          <input
            type="number"
            min={13}
            max={18}
            value={ageMin}
            onChange={(e) => setAgeMin(parseInt(e.target.value || "0", 10))}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>

        <Label text="Âge max (13–18)">
          <input
            type="number"
            min={13}
            max={18}
            value={ageMax}
            onChange={(e) => setAgeMax(parseInt(e.target.value || "0", 10))}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>

        <Label text="Places">
          <input
            type="number"
            min={1}
            value={spotsTotal}
            onChange={(e) => setSpotsTotal(parseInt(e.target.value || "0", 10))}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </Label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {ok && <p className="text-xs text-green-400">Stage publié.</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Publication…" : "Publier"}
      </button>
    </form>
  )
}

function Label({
  text,
  full,
  children,
}: {
  text: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
        {text}
      </span>
      {children}
    </label>
  )
}

/**
 * Close-internship action.
 * Calls POST /api/admin/internships/:id/close
 *
 * NOTE: this endpoint is not yet implemented (see report). Component is
 * complete; backend is the gap.
 */
export function CloseInternshipButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function close() {
    if (!confirm("Fermer ce stage aux candidatures ?")) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/internships/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de fermeture")
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={close}
        disabled={busy}
        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "Fermeture…" : "Fermer le stage"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

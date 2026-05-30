"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CSRFAwareForm,
  useCSRFAwareSubmit,
} from "@/components/forms/csrf-aware-form"

interface TeenOption {
  id: string
  name: string
}

const PROVIDERS = [
  { value: "cashplus", label: "Cash Plus" },
  { value: "wafacash", label: "Wafacash" },
  { value: "m2t", label: "M2T (Inwi Money)" },
  { value: "damanecash", label: "Damane Cash" },
  { value: "baridcash", label: "Barid Cash" },
  { value: "other", label: "Autre" },
] as const

export function ManualTopupForm({ teens }: { teens: TeenOption[] }) {
  const router = useRouter()
  const submitWithCSRF = useCSRFAwareSubmit()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [teenId, setTeenId] = useState(teens[0]?.id ?? "")
  const [amountDh, setAmountDh] = useState<string>("100")
  const [provider, setProvider] = useState<string>("cashplus")
  const [providerRef, setProviderRef] = useState("")
  const [screenshotPath, setScreenshotPath] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)

    const amt = Number(amountDh)
    if (!teenId) {
      setError("Sélectionnez un teen.")
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Montant invalide.")
      return
    }
    if (!providerRef.trim()) {
      setError("Référence PSP obligatoire.")
      return
    }

    setBusy(true)
    try {
      const res = await submitWithCSRF("/api/parent/topup/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teen_id: teenId,
          amount_dh: amt,
          provider,
          provider_ref: providerRef.trim(),
          screenshot_path: screenshotPath.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        if (data.requiresSignature) {
          setError("Vous devez signer l'autorisation parentale d'abord.")
        } else if (data.error === "duplicate_provider_ref") {
          setError("Cette référence PSP a déjà été soumise.")
        } else {
          setError(data.error ?? "Erreur inconnue")
        }
        setBusy(false)
        return
      }
      setOk(data.message ?? "Demande envoyée.")
      setProviderRef("")
      setScreenshotPath("")
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Erreur réseau")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CSRFAwareForm
      onSubmit={submit}
      className="rounded-xl border border-ink bg-card p-6"
      autoComplete="off"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs uppercase text-mute">Teen</label>
          <select
            value={teenId}
            onChange={(e) => setTeenId(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink bg-background p-2 text-ink"
          >
            {teens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-mute">Montant (DH)</label>
          <input
            type="number"
            min={1}
            step="0.01"
            value={amountDh}
            onChange={(e) => setAmountDh(e.target.value)}
            inputMode="decimal"
            autoComplete="transaction-amount"
            className="mt-1 w-full rounded-md border border-ink bg-background p-2 text-ink"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-mute">Opérateur PSP</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink bg-background p-2 text-ink"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-mute">
            Référence transaction
          </label>
          <input
            type="text"
            value={providerRef}
            onChange={(e) => setProviderRef(e.target.value)}
            placeholder="ex. CP12345678"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            className="mt-1 w-full rounded-md border border-ink bg-background p-2 text-ink"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs uppercase text-mute">
            Justificatif (chemin bucket privé, optionnel)
          </label>
          <input
            type="text"
            value={screenshotPath}
            onChange={(e) => setScreenshotPath(e.target.value)}
            placeholder="topup-evidence/<parent_id>/<file>.jpg"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-ink bg-background p-2 text-ink"
          />
          <p className="mt-1 text-xs text-mute">
            Téléversez d'abord la capture d'écran du reçu PSP via le bucket privé,
            puis collez ici le chemin.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-pink/40 bg-pink/10 p-3 text-sm text-pink">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-4 rounded-md border border-lime/40 bg-lime/10 p-3 text-sm text-lime">
          {ok}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 rounded-md bg-lime px-6 py-2 text-sm font-semibold text-ink hover:bg-lime disabled:opacity-50"
      >
        {busy ? "Envoi..." : "Soumettre la demande"}
      </button>
    </CSRFAwareForm>
  )
}

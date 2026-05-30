"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Trash2, Check, Loader2, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { NivCoach } from "@/components/brand"
import { createClient } from "@/lib/supabase/client"

const CONFIRM_PHRASE = "DELETE MY ACCOUNT"

type DeleteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done" }
  | { status: "error"; message: string }

export function DeleteClient() {
  const [email, setEmail] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [state, setState] = useState<DeleteState>({ status: "idle" })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser()
        if (!cancelled) setEmail(data.user?.email ?? "")
      } catch {
        // ignore — user simply not authed
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const typed = confirmText.trim()
  const matches =
    typed.length > 0 &&
    ((email.length > 0 && typed.toLowerCase() === email.toLowerCase()) ||
      typed === CONFIRM_PHRASE)

  const requestDelete = async () => {
    if (!matches) return
    setState({ status: "loading" })
    try {
      const res = await fetch("/api/me/data-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      })
      const data = await res.json()
      if (!data.ok) {
        setState({ status: "error", message: humanError(data.error, res.status) })
        return
      }
      setState({ status: "done" })
    } catch {
      setState({ status: "error", message: "La suppression a échoué. Réessaie dans un instant." })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Confidentialité · CNDP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Supprimer mon <em className="font-semibold italic text-pink">compte</em>
        </h1>
        <p className="text-mute">Efface définitivement ton compte et tes données.</p>
      </header>

      <NivCoach
        mood="calm"
        message="Avant de partir : pense à exporter tes données. La suppression est définitive, mais on te laisse 30 jours pour changer d'avis."
      />

      {state.status === "done" ? (
        <StickerCard className="gap-3 border-lime p-6" style={{ background: "var(--success-soft)" }}>
          <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="grid size-6 place-items-center rounded-full bg-lime">
              <Check className="size-4 text-ink" strokeWidth={4} aria-hidden="true" />
            </span>
            Demande enregistrée
          </p>
          <p className="text-sm text-ink-2">
            Ton compte sera supprimé sous{" "}
            <span className="font-mono">30 jours</span>. Un éventuel solde de coins ⊙ restant te
            sera remboursé selon les CGV. Reconnecte-toi avant la fin du délai pour annuler.
          </p>
        </StickerCard>
      ) : (
        <StickerCard className="gap-4 border-destructive p-6" style={{ background: "var(--danger-soft)" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <h2 className="font-display font-bold text-ink">Action irréversible</h2>
              <p className="text-sm text-ink-2">
                Ton profil, ton solde, ton historique et tes contenus seront supprimés{" "}
                <span className="font-mono">sous 30 jours</span>. Un solde de coins ⊙ restant sera
                remboursé selon les CGV.
              </p>
            </div>
          </div>

          <FieldInput
            id="confirm-delete"
            label="Confirme avec ton e-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={email || "ton@email.com"}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            hint="Tape ton adresse e-mail pour débloquer la suppression."
          />

          <Button
            variant="destructive"
            className="w-fit"
            onClick={requestDelete}
            disabled={!matches || state.status === "loading"}
          >
            {state.status === "loading" ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
            )}
            Demander la suppression
          </Button>

          {state.status === "error" ? (
            <p role="alert" className="text-sm font-medium text-coral">
              {state.message}
            </p>
          ) : null}
        </StickerCard>
      )}

      <Button asChild variant="outline" className="w-fit">
        <Link href="/account/export">
          <Download className="mr-2 size-4" aria-hidden="true" />
          Exporter avant de partir
        </Link>
      </Button>
    </div>
  )
}

function humanError(code?: string, status?: number): string {
  if (code === "already_pending" || status === 409)
    return "Une demande de suppression est déjà en cours sur ce compte."
  if (code === "confirmation_mismatch")
    return "La confirmation ne correspond pas à ton e-mail. Vérifie la saisie."
  if (code === "unauthenticated") return "Tu dois être connecté pour supprimer ton compte."
  return "La suppression a échoué. Réessaie dans un instant."
}

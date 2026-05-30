"use client"

import { useState } from "react"
import { Download, FileJson, ShieldCheck, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"

type ExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; downloadUrl?: string }
  | { status: "error"; message: string }

export function ExportClient() {
  const [state, setState] = useState<ExportState>({ status: "idle" })

  const requestExport = async () => {
    setState({ status: "loading" })
    try {
      const res = await fetch("/api/me/data-export", { method: "POST" })
      const data = await res.json()
      if (!data.ok) {
        setState({ status: "error", message: humanError(data.error) })
        return
      }
      setState({
        status: "done",
        downloadUrl: data.mode === "signed_url" ? data.download_url : undefined,
      })
    } catch {
      setState({ status: "error", message: "L'export a échoué. Réessaie dans un instant." })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Confidentialité · CNDP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Exporter mes <em className="font-semibold italic text-pink">données</em>
        </h1>
        <p className="text-mute">Reçois une copie complète de tes données personnelles.</p>
      </header>

      <NivCoach
        mood="calm"
        message="Tes données t'appartiennent. Demande-les quand tu veux — je te prépare une archive complète."
      />

      <StickerCard className="gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-info-soft">
            <FileJson className="size-5 text-teal" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display font-bold text-ink">Archive complète</h2>
            <p className="text-sm text-mute">
              Profil, transactions, XP, contenus — au format lisible{" "}
              <span className="font-mono text-ink-2">JSON/CSV</span>, envoyé par e-mail{" "}
              <span className="font-mono text-ink-2">sous 30 jours</span>.
            </p>
          </div>
        </div>

        {state.status === "done" ? (
          <div className="rounded-xl border-2 border-lime bg-success-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="grid size-5 place-items-center rounded-full bg-lime">
                <Check className="size-3 text-ink" strokeWidth={4} aria-hidden="true" />
              </span>
              Demande enregistrée
            </p>
            <p className="mt-1 text-sm text-mute">
              Ton archive arrive par e-mail. Pense à vérifier tes spams.
            </p>
            {state.downloadUrl ? (
              <Button asChild variant="outline" className="mt-3 w-fit">
                <a href={state.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 size-4" aria-hidden="true" />
                  Télécharger maintenant
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <Button variant="pink" className="w-fit" onClick={requestExport} disabled={state.status === "loading"}>
              {state.status === "loading" ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 size-4" aria-hidden="true" />
              )}
              Demander l'export
            </Button>
            {state.status === "error" ? (
              <p role="alert" className="text-sm font-medium text-coral">
                {state.message}
              </p>
            ) : null}
          </>
        )}
      </StickerCard>

      <p className="flex items-center gap-2 text-xs text-mute">
        <ShieldCheck className="size-4 text-lime" aria-hidden="true" /> Conforme à la loi 09-08
        (CNDP). Tes données ne sont jamais revendues.
      </p>
    </div>
  )
}

function humanError(code?: string): string {
  switch (code) {
    case "unauthenticated":
      return "Tu dois être connecté pour exporter tes données."
    case "rate_limited":
      return "Tu as déjà demandé un export récemment. Réessaie un peu plus tard."
    default:
      return "L'export a échoué. Réessaie dans un instant."
  }
}

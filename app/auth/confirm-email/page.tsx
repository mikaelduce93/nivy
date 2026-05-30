import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

const STEPS = [
  "Vérifie ta boîte de réception",
  "Clique sur le lien de confirmation",
  "Tu es redirigé vers ton tableau de bord",
]

export default function ConfirmEmailPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-6 md:p-10">
      <MeshBackground />

      <div className="relative z-10 w-full max-w-md">
        <StickerCard className="p-6 sm:p-7">
          <p className="eyebrow tracking-[0.16em]">Vérification</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
            Confirme ton <em className="font-semibold italic text-pink">email</em>
          </h1>

          <div className="mt-4">
            <NivCoach
              mood="calm"
              message="J'ai envoyé ton lien — check ta boîte. Une fois validé, tu gagnes ton XP de départ et tu débloques ton crew."
            />
          </div>

          <ol className="mt-5 space-y-2" aria-label="Étapes pour confirmer ton email">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <p className="mt-5 rounded-xl border-2 border-line bg-white p-3 text-sm text-mute">
            Pas reçu le mail ? Pense à regarder dans tes spams — il arrive parfois là.
          </p>

          <Button asChild variant="pink" className="mt-5 h-12 w-full text-base">
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
          <div className="mt-3 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-pink underline-offset-4 hover:underline"
            >
              Retour à l'accueil
            </Link>
          </div>
        </StickerCard>
      </div>
    </div>
  )
}

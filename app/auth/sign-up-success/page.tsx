"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

const STEPS = [
  "Ouvre le mail qu'on vient de t'envoyer",
  "Clique sur le lien de confirmation",
  "Reviens te connecter, c'est tout bon",
]

export default function SignUpSuccessPage() {
  const [celebrate] = useState(true)

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-6 md:p-10">
      <MeshBackground />
      <Confetti trigger={celebrate} palette="reward" />

      <div className="relative z-10 w-full max-w-sm">
        <StickerCard className="p-7 text-center">
          <Niv mood="proud" size={120} className="mx-auto" />
          <p className="mt-3 eyebrow tracking-[0.16em]">Compte créé</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink">
            C'est <em className="font-semibold italic text-pink">parti</em> !
          </h1>
          <p className="mt-2 text-sm text-mute">Check ton mail, ton crew t'attend.</p>

          <ol className="mt-5 space-y-2 text-left">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <Button asChild variant="pink" className="mt-6 h-12 w-full text-base">
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
          <Link
            href="/auth/confirm-email"
            className="mt-3 inline-block text-sm font-semibold text-pink underline-offset-4 hover:underline"
          >
            Renvoyer le lien
          </Link>
        </StickerCard>
      </div>
    </div>
  )
}

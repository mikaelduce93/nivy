/**
 * Dev-only preview pour <OrbitingTokens> (F3).
 *
 * Rendu sur fond paper ET dans une <DarkSurface>, plus une variante figée
 * (reduced-motion) pour smoke-test visuel. Non linké ; accès prod bloqué via
 * le guard NODE_ENV.
 */

import { notFound } from "next/navigation"

import { OrbitingTokens } from "@/components/brand/orbiting-tokens"
import { DarkSurface } from "@/components/brand/niv"

export const dynamic = "force-dynamic"

export default function OrbitingTokensPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-10 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <header>
          <p className="eyebrow tracking-[0.16em]">Kit · Dev only</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Tokens <em className="font-semibold not-italic text-pink italic">orbitants</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Niv au centre, 4 mini-cartes sticker en orbite (XP or / Coins corail
            ⊙ / Niveau teal / Streak rose 🔥).
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="eyebrow tracking-[0.16em]">Sur fond paper</h2>
          <div className="flex justify-center rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm">
            <OrbitingTokens xp="2 480" coins="1 250" level="7" streak="12 j" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="eyebrow tracking-[0.16em]">Sur surface sombre</h2>
          <DarkSurface className="flex justify-center p-6">
            <OrbitingTokens xp="2 480" coins="1 250" level="7" streak="12 j" />
          </DarkSurface>
        </section>
      </div>
    </div>
  )
}

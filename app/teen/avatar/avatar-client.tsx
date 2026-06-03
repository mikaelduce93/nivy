"use client"

import { useState } from "react"
import { Niv, DarkSurface, type NivMood } from "@/components/brand"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

const MOODS: { id: NivMood; label: string; emoji: string }[] = [
  { id: "happy", label: "Happy", emoji: "🙂" },
  { id: "hype", label: "Hype", emoji: "🔥" },
  { id: "proud", label: "Proud", emoji: "😎" },
  { id: "calm", label: "Calm", emoji: "🌙" },
  { id: "wink", label: "Wink", emoji: "😉" },
]

// Skins débloquables à l'XP — catalogue de démarrage (le starter pack onboarding
// offre déjà "hoodie pink"). Le déblocage réel par XP arrive avec l'économie skins.
const SKINS = [
  { id: "hoodie-pink", label: "Hoodie Pink", unlocked: true },
  { id: "varsity", label: "Varsity", unlocked: false, cost: 500 },
  { id: "streetwear", label: "Streetwear", unlocked: false, cost: 1200 },
  { id: "neon-night", label: "Neon Night", unlocked: false, cost: 2500 },
]

// NivMood (mascotte) → humeur persistée côté avatars.mood (taxonomie DB).
const MOOD_TO_AVATAR: Record<NivMood, string> = {
  happy: "happy",
  hype: "celebrating",
  proud: "focused",
  calm: "neutral",
  wink: "happy",
}

export function AvatarClient() {
  const [mood, setMood] = useState<NivMood>("happy")

  // Optimistic UI + best-effort persistence to /api/teen/avatar (set_mood).
  const selectMood = (m: NivMood) => {
    setMood(m)
    void fetch("/api/teen/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_mood", mood: MOOD_TO_AVATAR[m] }),
    }).catch(() => {
      /* humeur affichée tout de suite ; persistance best-effort */
    })
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Personnalisation</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Ton avatar <span className="text-pink italic">Niv</span>
        </h1>
        <p className="text-mute max-w-md">
          Donne le ton à ton coach panda. Débloque des skins en gagnant de l'XP.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Aperçu — surface sombre charte, héro réservé à la mascotte */}
        <DarkSurface
          shadow
          className="flex flex-col items-center justify-center py-10"
        >
          <Niv size={200} mood={mood} float />
          <p className="mt-4 font-mono text-sm uppercase tracking-widest text-paper/70">
            humeur · {mood}
          </p>
        </DarkSurface>

        {/* Sélecteurs */}
        <div className="space-y-6">
          <section className="space-y-3">
            <p className="eyebrow">Humeur</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMood(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 border-ink px-4 py-2.5 text-sm font-bold transition-all",
                    "motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5",
                    mood === m.id
                      ? "bg-ink text-paper -translate-x-0.5 -translate-y-0.5 shadow-stkr-pink"
                      : "bg-card hover:shadow-stkr-sm",
                  )}
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="eyebrow">Skins</p>
            <div className="grid grid-cols-2 gap-3">
              {SKINS.map((s) => (
                <Card key={s.id} padding="sm" className="relative px-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{s.label}</span>
                    {s.unlocked ? (
                      <span className="rounded-full border border-ink bg-success-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide">
                        Actif
                      </span>
                    ) : (
                      // #201 Stop the lies — le déblocage de skins par XP n'est pas
                      // implémenté : on affiche « Bientôt » au lieu d'un faux prix XP
                      // (qui laissait croire que l'XP s'achète/se dépense ici).
                      <span className="flex items-center gap-1 text-mute text-[10px] font-mono font-bold uppercase tracking-wide">
                        <Lock className="h-3 w-3" /> Bientôt
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-xs text-mute">
              D&apos;autres skins arrivent bientôt.
            </p>
          </section>

          <Button asChild variant="pink">
            <a href="/teen/quests">Faire mes quêtes →</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

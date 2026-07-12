"use client"

import { useState } from "react"
import { Niv, DarkSurface, type NivMood } from "@/components/brand"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import { NIV_SKINS } from "@/lib/gamification/skins"

const MOODS: { id: NivMood; label: string; emoji: string }[] = [
  { id: "happy", label: "Happy", emoji: "🙂" },
  { id: "hype", label: "Hype", emoji: "🔥" },
  { id: "proud", label: "Proud", emoji: "😎" },
  { id: "calm", label: "Calm", emoji: "🌙" },
  { id: "wink", label: "Wink", emoji: "😉" },
]

// NivMood (mascotte) → humeur persistée côté avatars.mood (taxonomie DB).
const MOOD_TO_AVATAR: Record<NivMood, string> = {
  happy: "happy",
  hype: "celebrating",
  proud: "focused",
  calm: "neutral",
  wink: "happy",
}

// Taxonomie DB → NivMood (pour réhydrater l'humeur persistée au chargement).
const AVATAR_TO_MOOD: Record<string, NivMood> = {
  happy: "happy",
  celebrating: "hype",
  focused: "proud",
  neutral: "calm",
  sad: "calm",
  tired: "calm",
}

const DEFAULT_SKIN = "hoodie-pink"

interface AvatarClientProps {
  /** Niveau réel de l'ado (courbe UI — même source que le wallet). */
  level: number
  /** Skin persisté (avatars.skin) ou null si jamais choisi. */
  initialSkin: string | null
  /** Humeur persistée (avatars.mood, taxonomie DB) ou null. */
  initialMood: string | null
}

// G2-A (décision PO 2026-07-11) — skins = récompenses de niveau, GRATUITES :
// plus aucun coût (ni XP ni coins). Catalogue + niveaux : lib/gamification/
// skins.ts ; skin équipé persisté dans avatars.skin (même mécanisme que mood).
export function AvatarClient({ level, initialSkin, initialMood }: AvatarClientProps) {
  const [mood, setMood] = useState<NivMood>(
    (initialMood && AVATAR_TO_MOOD[initialMood]) || "happy"
  )
  const [skin, setSkin] = useState<string>(
    initialSkin && NIV_SKINS.some((s) => s.id === initialSkin) ? initialSkin : DEFAULT_SKIN
  )

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

  // Équipement optimiste ; la route re-vérifie le niveau côté serveur.
  const selectSkin = (id: string, unlockLevel: number) => {
    if (level < unlockLevel || skin === id) return
    setSkin(id)
    void fetch("/api/teen/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_skin", skin: id }),
    }).catch(() => {
      /* skin affiché tout de suite ; persistance best-effort */
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
          Donne le ton à ton coach panda. Les skins sont des récompenses de niveau : gratuits,
          débloqués en progressant.
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
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">Skins</p>
              <span className="font-mono text-xs font-bold tabular-nums text-teal">
                Tu es niveau {level}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {NIV_SKINS.map((s) => {
                const unlocked = level >= s.unlockLevel
                const equipped = skin === s.id
                return (
                  <Card
                    key={s.id}
                    padding="sm"
                    className={cn("relative px-4", !unlocked && "opacity-70")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{s.label}</span>
                      {equipped ? (
                        <span className="rounded-full border border-ink bg-success-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide">
                          Actif
                        </span>
                      ) : unlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectSkin(s.id, s.unlockLevel)}
                        >
                          Équiper
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-mute text-[10px] font-mono font-bold uppercase tracking-wide">
                          <Lock className="h-3 w-3" aria-hidden="true" /> Niveau {s.unlockLevel}
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
            <p className="text-xs text-mute">
              Chaque skin se débloque à un niveau — gratuit, sans dépenser ni XP ni coins.
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

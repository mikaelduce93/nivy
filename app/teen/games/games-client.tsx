"use client"

import { useState } from "react"
import { Gamepad2, Zap, Trophy, Play, Users, Clock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, NivCoach, NivEmpty } from "@/components/brand"

export type GameType = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string
  base_xp: number
  is_daily: boolean
  cooldown_minutes: number
  min_players: number
  max_players: number
}

export type GameStats = {
  total_played: number
  total_xp: number
  total_wins: number
}

const CATEGORIES = [
  { value: "all", label: "Tous", icon: <Gamepad2 /> },
  { value: "daily", label: "Quotidien", icon: <Clock /> },
  { value: "brain", label: "Cerveau", icon: <Target /> },
  { value: "pvp", label: "PvP", icon: <Users /> },
]

interface Props {
  games: GameType[]
  stats: GameStats
}

export function GamesClient({ games, stats }: Props) {
  const [category, setCategory] = useState("all")

  const dailyGames = games.filter((g) => g.is_daily)
  const challengeGames = games.filter((g) => !g.is_daily && g.max_players > 1)

  const totalPlayed = stats.total_played
  const totalXp = stats.total_xp
  const totalWins = stats.total_wins

  return (
    <div className="min-h-screen space-y-8 pb-32 pt-6">
      {/* Header éditorial */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <Niv mood="hype" size={72} className="shrink-0" />
          <div>
            <p className="eyebrow tracking-[0.16em]">Arène · Jeux</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Joue, gagne des <em className="font-semibold italic text-pink">XP</em>
            </h1>
            <p className="text-sm text-mute">Des mini-jeux chaque jour pour booster ton XP.</p>
          </div>
        </div>

        <NivCoach mood="hype" message="Chaque partie compte. Enchaîne les jeux du jour et regarde ton XP grimper !" />

        {/* Stats cumulées — pills sticker mono */}
        <div className="grid grid-cols-3 gap-3">
          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-ink">
              <Play className="size-4 text-teal" aria-hidden="true" />
              {totalPlayed}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">Parties jouées</span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-gold">
              <Zap className="size-4 text-gold" aria-hidden="true" />
              {totalXp}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">XP gagnés</span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-pink">
              <Trophy className="size-4 text-pink" aria-hidden="true" />
              {totalWins}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">Victoires</span>
          </StickerCard>
        </div>

        {/* Filtres */}
        <StickerTabs
          ariaLabel="Catégories de jeux"
          value={category}
          onValueChange={setCategory}
          tabs={CATEGORIES}
        />
      </header>

      {/* Jeux quotidiens */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Jeux du jour</p>

        {dailyGames.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Pas de jeu pour l'instant"
            description="Reviens t'éclater plus tard — de nouveaux jeux quotidiens arrivent chaque jour."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {dailyGames.map((game) => (
              <StickerCard key={game.id} variant="hover" className="gap-4 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-5xl" aria-hidden="true">
                    {game.icon || "🎮"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-extrabold text-ink">{game.name}</h3>
                    <p className="mb-3 text-sm text-mute">{game.description}</p>
                    <span className="flex items-center gap-1.5 font-mono font-bold text-gold">
                      <Zap className="size-4" aria-hidden="true" />+{game.base_xp} XP
                    </span>
                  </div>
                </div>

                <Button variant="pink" className="w-full">
                  <Play className="mr-2 size-4" aria-hidden="true" />
                  Jouer
                </Button>
              </StickerCard>
            ))}
          </div>
        )}
      </section>

      {/* Défis multijoueur */}
      {challengeGames.length > 0 && (
        <section className="space-y-4">
          <p className="eyebrow tracking-[0.16em]">Défis multijoueur</p>

          <div className="space-y-4">
            {challengeGames.map((game) => (
              <StickerCard key={game.id} variant="hover" className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-5xl" aria-hidden="true">
                    {game.icon || "🎮"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-extrabold text-ink">{game.name}</h3>
                    <p className="text-sm text-mute">{game.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="flex items-center justify-end gap-1.5 font-mono font-bold text-gold">
                      <Zap className="size-4" aria-hidden="true" />+{game.base_xp} XP
                    </span>
                    <span className="flex items-center justify-end gap-1 font-mono text-xs text-mute">
                      <Users className="size-3" aria-hidden="true" />
                      max {game.max_players}
                    </span>
                  </div>
                  <Button variant="outline">Rejoindre</Button>
                </div>
              </StickerCard>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

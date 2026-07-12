"use client"

/**
 * /teen/games — catalogue des mini-jeux JOUABLES + classement hebdo (G4-C,
 * spec docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §7.4 catalogue honnête, §8 J5/J7).
 *
 * Fin du théâtre « Bientôt » : chaque carte visible se joue (Link vers
 * /teen/games/[slug] — les pages de jeu gèrent elles-mêmes la dégradation si
 * les migrations 181/182 manquent). Les jeux legacy non construits
 * (blindtest, music_quiz, predictions…) ne sont plus affichés du tout (§7.4).
 * AUCUN bouton disabled.
 *
 * Classement (J7) : onglets « Mes amis » / « Mon crew » — victoires battles +
 * points mini-jeux de la semaine, jamais de classement global public (§9 P8).
 */

import { useState } from "react"
import Link from "next/link"
import {
  Gamepad2,
  Play,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, NivCoach, NivEmpty } from "@/components/brand"
import type { LadderRow, WeeklyLadder } from "./ladder-types"

export interface GameCardData {
  slug: string
  name: string
  emoji: string
  description: string
  /** XP max par session (affichage — le crédit réel vient du serveur). */
  baseXp: number
  /** Sessions créditées en XP aujourd'hui (jour Africa/Casablanca). */
  creditedToday: number
  /** Plafond §6.2-5 (3 sessions créditées / jeu / jour). */
  capPerDay: number
}

export interface GameStats {
  total_played: number
  total_xp: number
  total_wins: number
}

interface Props {
  stats: GameStats
  games: GameCardData[]
  ladder: WeeklyLadder
}

export function GamesClient({ stats, games, ladder }: Props) {
  const [ladderTab, setLadderTab] = useState("friends")

  return (
    <div className="min-h-screen space-y-8 pb-32 pt-6">
      {/* Header éditorial */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <Niv mood="hype" size={72} className="shrink-0" />
          <div>
            <p className="eyebrow tracking-[0.16em]">Arcade · Solo & duel</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Salle de <em className="font-semibold italic text-pink">jeux</em>
            </h1>
            <p className="text-sm text-mute">
              Des parties courtes, de l&apos;XP réel — jamais de coins.
            </p>
          </div>
        </div>

        <NivCoach
          mood="hype"
          message="Chaque partie compte pour de vrai : l'XP est crédité par le serveur, et les 3 premières sessions du jour rapportent."
        />

        {/* Stats réelles (game_sessions + battles gagnées) */}
        <div className="grid grid-cols-3 gap-3">{/* canon-allow: 3 pills stats compactes lisibles à 375px — parité exacte avec la baseline de ce fichier */}
          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-ink">
              <Play className="size-4 text-teal" aria-hidden="true" />
              {stats.total_played}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              Parties
            </span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-gold">
              <Zap className="size-4 text-gold" aria-hidden="true" />
              {stats.total_xp}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              XP gagné
            </span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-pink">
              <Trophy className="size-4 text-pink" aria-hidden="true" />
              {stats.total_wins}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              Victoires
            </span>
          </StickerCard>
        </div>
      </header>

      {/* Battles 1v1 — entrée duel (§8 J4, page /teen/battles) */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">En duel</p>
        <Link href="/teen/battles" className="block">
          <StickerCard variant="hover" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold shadow-stkr-sm">
                  <Swords className="h-7 w-7 text-ink" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-extrabold text-ink">
                    Battle 1v1 — défie un ami en duel
                  </h2>
                  <p className="text-sm text-mute">
                    Même question, même chrono : 5 rounds de 15 secondes, en temps réel.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-pink">
                Jouer
                <Play className="size-4" aria-hidden="true" />
              </span>
            </div>
          </StickerCard>
        </Link>
      </section>

      {/* Mini-jeux solo — tout ce qui est visible se joue (§7.4) */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Mini-jeux solo</p>

        {games.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun mini-jeu actif"
            description="Les mini-jeux sont momentanément désactivés. Reviens bientôt !"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const training = game.creditedToday >= game.capPerDay
              return (
                <Link key={game.slug} href={`/teen/games/${game.slug}`} className="block h-full">
                  <StickerCard variant="hover" className="h-full gap-4 p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-5xl" aria-hidden="true">
                        {game.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-extrabold text-ink">
                          {game.name}
                        </h3>
                        <p className="text-sm text-mute">{game.description}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-gold">
                        <Zap className="size-4" aria-hidden="true" />
                        jusqu&apos;à +{game.baseXp} XP
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-pink">
                        Jouer
                        <Play className="size-4" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-mute">
                      {training
                        ? "XP du jour atteint — mode entraînement"
                        : `${game.creditedToday}/${game.capPerDay} sessions créditées aujourd'hui`}
                    </p>
                  </StickerCard>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Classement de la semaine — amis + crew uniquement (J7, §9 P8) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow tracking-[0.16em]">Classement de la semaine</p>
          <p className="font-mono text-[11px] text-mute">
            Uniquement tes amis et ton crew — jamais de classement public.
          </p>
        </div>

        <StickerTabs
          ariaLabel="Classement amis ou crew"
          value={ladderTab}
          onValueChange={setLadderTab}
          tabs={[
            { value: "friends", label: "Mes amis", icon: <Users /> },
            { value: "crew", label: "Mon crew", icon: <Gamepad2 /> },
          ]}
        />

        {ladderTab === "friends" ? (
          ladder.hasFriends ? (
            <LadderList rows={ladder.friends} />
          ) : (
            <NivEmpty
              mood="calm"
              title="Pas encore d'amis à classer"
              description="Ajoute des amis pour comparer vos victoires en battle et vos scores de mini-jeux."
              action={
                <Button variant="pink" asChild>
                  <Link href="/teen/friends">Ajouter des amis</Link>
                </Button>
              }
            />
          )
        ) : ladder.crew.hasCrew ? (
          <div className="space-y-4">
            {/* Carte crew — victoires cumulées (crews.total_challenges_won) */}
            <StickerCard className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-paper shadow-stkr-sm">
                    <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display font-extrabold text-ink">
                      {ladder.crew.name || "Ton crew"}
                    </p>
                    <p className="font-mono text-xs text-mute">Victoires du crew, toutes saisons</p>
                  </div>
                </div>
                <span className="font-display text-2xl font-extrabold tabular-nums text-gold">
                  {ladder.crew.totalChallengesWon}
                </span>
              </div>
            </StickerCard>

            <LadderList rows={ladder.crew.rows} />
          </div>
        ) : (
          <NivEmpty
            mood="calm"
            title="Pas encore de crew"
            description="Rejoins un crew pour comparer vos scores de la semaine et cumuler des victoires ensemble."
            action={
              <Button variant="pink" asChild>
                <Link href="/teen/circles">Trouver un crew</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Sous-composants classement
 * ------------------------------------------------------------------------- */

function LadderList({ rows }: { rows: LadderRow[] }) {
  if (rows.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Personne au classement"
        description="Joue une partie ou gagne une battle pour ouvrir le score de la semaine."
      />
    )
  }
  return (
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border-2 border-ink px-3 py-2 shadow-stkr-sm",
            row.isMe ? "bg-paper" : "bg-white",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-6 shrink-0 text-center font-mono text-sm font-bold tabular-nums text-mute">
              {index + 1}
            </span>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-sm font-extrabold text-ink"
            >
              {(row.pseudo || "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-ink">
                {row.pseudo}
                {row.isMe ? <span className="ml-1 text-xs font-semibold text-pink">(toi)</span> : null}
              </p>
              <p className="font-mono text-xs text-mute">Niveau {row.level}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-pink"
              title="Battles gagnées cette semaine"
            >
              <Trophy className="size-4" aria-hidden="true" />
              {row.wins}
            </span>
            <span
              className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-teal"
              title="Points mini-jeux cette semaine"
            >
              <Gamepad2 className="size-4" aria-hidden="true" />
              {row.points}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

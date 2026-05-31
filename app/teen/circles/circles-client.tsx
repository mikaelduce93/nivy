"use client"

import { useState } from "react"
import { Shield, Users, Crown, Zap, Trophy, Search, Plus, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { StatHero, NivEmpty } from "@/components/brand"

type Member = {
  user_id: string
  pseudo: string
  avatar_url: string | null
  level: number
  role: "owner" | "admin" | "member"
  xp_contributed: number
}

type UserCrewData = {
  has_crew: boolean
  crew?: {
    id: string
    name: string
    slug: string
    description: string | null
    color: string
    badge_icon: string
    total_xp: number
    total_events_attended: number
    total_challenges_won: number
    average_level: number
  }
  user_role?: "owner" | "admin" | "member"
  members?: Member[]
}

type DiscoverCrew = {
  id: string
  name: string
  description: string | null
  color: string
  badge_icon: string
  total_xp: number
  average_level: number
  max_members: number
}

type LeaderboardEntry = {
  crew_id: string
  rank?: number
  position?: number
  total_xp?: number
  weekly_xp?: number
}

interface Props {
  myCrew: UserCrewData | null
  discoverCrews: DiscoverCrew[]
  leaderboard: LeaderboardEntry[]
}

// Libellés FR des rôles (fin du brut anglais owner/admin/member).
const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Chef",
  admin: "Admin",
  member: "Membre",
}

export function CirclesPageClient({ myCrew, discoverCrews, leaderboard }: Props) {
  const [tab, setTab] = useState<"crew" | "discover">("crew")
  const [searchQuery, setSearchQuery] = useState("")

  const hasCrew = !!myCrew?.has_crew && !!myCrew.crew
  const crew = myCrew?.crew
  const members = myCrew?.members || []

  // Find rank from leaderboard if present
  const myRank = crew ? leaderboard.find((l) => l.crew_id === crew.id)?.rank ?? leaderboard.find((l) => l.crew_id === crew.id)?.position ?? null : null

  const filteredCrews = discoverCrews.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      <header className="space-y-5">
        <div className="space-y-1">
          <p className="eyebrow tracking-[0.16em]">Équipe</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Tes <em className="font-semibold italic text-pink">crews</em>
          </h1>
          <p className="text-sm text-mute">Joue en équipe et débloque le bonus XP collectif.</p>
        </div>

        <StickerTabs
          ariaLabel="Sections crews"
          value={tab}
          onValueChange={(v) => setTab(v as "crew" | "discover")}
          tabs={[
            { value: "crew", label: "Ma crew", icon: <Shield /> },
            { value: "discover", label: "Découvrir", icon: <Search /> },
          ]}
        />
      </header>

      {tab === "crew" ? (
        hasCrew && crew ? (
          <>
            <StatHero
              eyebrow={`${crew.name} · ${members.length} membres · Lvl moy. ${Math.round(crew.average_level)}`}
              value={crew.total_xp.toLocaleString()}
              unit="XP"
              tone="gold"
              size="lg"
              meta="+20% XP sur les défis hebdo"
            />

            <div className="grid grid-cols-3 gap-3">
              <StickerCard className="items-center p-4 text-center">
                <p className="font-display text-2xl font-extrabold tabular-nums text-lime">{crew.total_challenges_won}</p>
                <p className="eyebrow mt-1 text-mute">Défis gagnés</p>
              </StickerCard>
              <StickerCard className="items-center p-4 text-center">
                <p className="font-display text-2xl font-extrabold tabular-nums text-teal">{myRank ? `#${myRank}` : "—"}</p>
                <p className="eyebrow mt-1 text-mute">Rang</p>
              </StickerCard>
              <StickerCard className="items-center p-4 text-center">
                <p className="font-display text-2xl font-extrabold tabular-nums text-gold">{crew.total_events_attended}</p>
                <p className="eyebrow mt-1 text-mute">Events</p>
              </StickerCard>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Membres</p>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <StickerCard
                    key={member.user_id}
                    className="flex-row items-center gap-4 p-4"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-ink bg-paper flex items-center justify-center text-lg font-bold text-ink">
                        {member.pseudo.charAt(0).toUpperCase()}
                      </div>
                      {member.role === "owner" && (
                        <Crown className="absolute -top-1 -right-1 w-5 h-5 text-gold fill-current" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-ink">{member.pseudo}</h4>
                        <span
                          className={cn(
                            "rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]",
                            member.role === "owner"
                              ? "bg-gold text-ink"
                              : member.role === "admin"
                              ? "bg-teal text-paper"
                              : "bg-paper text-mute"
                          )}
                        >
                          {ROLE_LABEL[member.role]}
                        </span>
                      </div>
                      <p className="text-xs text-mute">Lvl {member.level}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gold">
                      <Zap className="w-4 h-4" />
                      <span className="font-mono font-bold tabular-nums">{member.xp_contributed.toLocaleString()}</span>
                    </div>
                  </StickerCard>
                ))}
              </div>
            </section>
          </>
        ) : (
          <NivEmpty
            mood="hype"
            title="Pas encore de crew"
            description="Rejoins ou crée une crew pour participer aux défis et gagner des bonus XP."
            action={
              <Button variant="pink" onClick={() => setTab("discover")}>
                <Search className="w-4 h-4 mr-2" />
                Trouver une crew
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une crew…"
              className="pl-12 h-12 rounded-xl border-2 border-ink"
            />
          </div>

          <section className="space-y-4">
            <p className="eyebrow">Crews populaires</p>

            {filteredCrews.length === 0 ? (
              <NivEmpty
                title="Aucune crew publique"
                description="Aucune crew ne correspond à ta recherche pour le moment."
              />
            ) : (
              <div className="space-y-4">
                {filteredCrews.map((c) => {
                  const lbEntry = leaderboard.find((l) => l.crew_id === c.id)
                  const rank = lbEntry?.rank ?? lbEntry?.position
                  return (
                    <StickerCard key={c.id} variant="hover" className="flex-row items-center gap-4 p-6">
                      <div className="w-16 h-16 rounded-2xl border-2 border-ink bg-paper flex items-center justify-center text-2xl">
                        {c.badge_icon || <Shield className="w-8 h-8 text-ink" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-extrabold text-lg text-ink">{c.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-mute">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            max {c.max_members}
                          </span>
                          {rank && (
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              Rang #{rank}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-gold">
                            <Zap className="w-3 h-3" />
                            {c.total_xp.toLocaleString()} XP
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-xs text-mute mt-2 line-clamp-1">{c.description}</p>
                        )}
                      </div>
                      <Button>Voir</Button>
                    </StickerCard>
                  )
                })}
              </div>
            )}
          </section>

          <StickerCard className="flex-row items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl border-2 border-ink bg-pink flex items-center justify-center">
              <Plus className="w-7 h-7 text-ink" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-ink">Crée ta propre crew</h3>
              <p className="text-sm text-mute">Invite tes amis et domine le classement.</p>
            </div>
            <Button variant="pink">Créer</Button>
          </StickerCard>
        </>
      )}
    </div>
  )
}

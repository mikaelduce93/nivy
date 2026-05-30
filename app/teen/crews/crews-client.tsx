"use client"

import { useEffect, useState } from "react"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Search, Users, Zap, Loader2 } from "lucide-react"

interface Crew {
  name?: string
  emoji?: string
  tier?: string
  stats?: { memberCount?: number; totalXp?: number }
  members?: { id: string; name: string; xp: number }[]
}

export function CrewsClient() {
  const [crew, setCrew] = useState<Crew | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let off = false
    fetch("/api/teen/crew")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!off) setCrew(d?.crew ?? null) })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [])

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Équipe</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Ton <span className="text-pink italic">crew</span>
        </h1>
        <p className="text-mute max-w-md">
          Joue en équipe : les crews gagnent <b className="text-ink">+20% XP</b> sur les défis hebdo.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink" />
        </div>
      ) : crew ? (
        <div className="space-y-6">
          <Card className="bg-[linear-gradient(135deg,var(--night-2),var(--night))] border-ink p-8 gap-0">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl border-2 border-paper/20 bg-paper/10 flex items-center justify-center text-4xl">
                {crew.emoji || <Shield className="w-10 h-10 text-pink" />}
              </div>
              <div className="text-paper">
                <h2 className="text-3xl font-black font-display">{crew.name || "Mon crew"}</h2>
                <p className="text-paper/70">{crew.stats?.memberCount ?? crew.members?.length ?? 0} membres · {crew.tier || "Bronze"}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-gold font-black tabular-nums">
              <Zap className="w-5 h-5" /> {(crew.stats?.totalXp ?? 0).toLocaleString()} XP collectif
            </div>
          </Card>
          {crew.members && crew.members.length > 0 && (
            <div className="space-y-2">
              <p className="eyebrow">Membres</p>
              {crew.members.map((m) => (
                <Card key={m.id} padding="sm" className="px-4 flex-row items-center justify-between">
                  <span className="flex items-center gap-3 font-bold text-ink">
                    <Users className="w-4 h-4 text-teal" /> {m.name}
                  </span>
                  <span className="font-mono font-bold text-gold tabular-nums">{m.xp.toLocaleString()} XP</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="items-center text-center py-16">
          <Niv size={96} mood="hype" />
          <h3 className="text-2xl font-black text-ink mt-4 mb-2">Pas encore de crew</h3>
          <p className="text-mute max-w-sm mb-8">
            Rassemble tes potes pour les défis d'équipe et le bonus XP.
          </p>
          <div className="flex gap-3">
            <Button variant="pink">
              <Shield className="w-4 h-4 mr-2" /> Créer un crew
            </Button>
            <Button variant="outline">
              <Search className="w-4 h-4 mr-2" /> Rejoindre
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

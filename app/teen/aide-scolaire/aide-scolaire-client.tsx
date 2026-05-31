"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv, NivEmpty } from "@/components/brand"

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  average: number | null
  gradeCount: number
}

interface AideScolaireClientProps {
  subjects: Subject[]
  totalXP: number
  gradeCount: number
}

export function AideScolaireClient({
  subjects,
  totalXP,
  gradeCount,
}: AideScolaireClientProps) {
  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Niv mood="proud" size={72} />
        <div>
          <p className="eyebrow tracking-[0.16em]">École & XP</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ton <em className="font-semibold italic text-pink">aide scolaire</em>
          </h1>
          <p className="text-sm text-mute">Apprends et gagne des XP.</p>
        </div>
      </header>

      {/* XP hero — surface sombre, chiffre Bricolage gold */}
      <StatHero
        eyebrow="XP total gagné"
        value={totalXP.toLocaleString()}
        unit="XP"
        tone="gold"
        meta={
          <span>
            {gradeCount} note{gradeCount > 1 ? "s" : ""} validée
            {gradeCount > 1 ? "s" : ""} · {subjects.length} matière
            {subjects.length > 1 ? "s" : ""}
          </span>
        }
      />

      {/* Hub links — tutors + grades (plus orphelins) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/teen/aide-scolaire/grades" className="rounded-2xl focus-visible:outline-none">
          <StickerCard variant="hover" className="h-full p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-pink/15">
                <BookOpen className="h-5 w-5 text-ink" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-ink">Mes notes</h3>
                <p className="text-sm text-mute">Suivi validé par tes profs · XP gold.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
            </div>
          </StickerCard>
        </Link>
        <Link href="/teen/aide-scolaire/tutors" className="rounded-2xl focus-visible:outline-none">
          <StickerCard variant="hover" className="h-full p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-teal/15">
                <Users className="h-5 w-5 text-ink" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-ink">Trouver un tuteur</h3>
                <p className="text-sm text-mute">Centres et profs partenaires près de toi.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
            </div>
          </StickerCard>
        </Link>
      </div>

      {/* Subjects Grid */}
      <section className="space-y-4">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Mes matières
        </h2>

        {subjects.length === 0 ? (
          <NivEmpty
            mood="proud"
            title="Aucune note validée"
            description="Soumets tes notes pour suivi — ton prof les valide et tu gagnes des XP !"
            action={
              <Button asChild variant="pink" className="min-h-11">
                <Link href="/teen/aide-scolaire/grades">Voir mes notes</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                href="/teen/aide-scolaire/grades"
                className="rounded-2xl focus-visible:outline-none"
              >
                <StickerCard variant="hover" className="h-full gap-0 p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-paper-2 text-2xl">
                      {subject.icon}
                    </div>
                    <span className="font-mono text-xs text-mute">
                      {subject.gradeCount} note{subject.gradeCount > 1 ? "s" : ""}
                    </span>
                  </div>

                  <h3 className="mb-2 font-display text-lg font-bold text-ink">
                    {subject.name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm tabular-nums text-mute">
                      {subject.average !== null
                        ? `Moyenne : ${subject.average}/20`
                        : "Aucune note"}
                    </span>
                    {subject.average !== null && (
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          subject.average >= 14
                            ? "text-lime"
                            : subject.average >= 10
                              ? "text-gold"
                              : "text-coral"
                        )}
                      >
                        {subject.average >= 14
                          ? "Excellent"
                          : subject.average >= 10
                            ? "Bien"
                            : "À améliorer"}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end font-mono text-xs font-bold text-mute">
                    Voir <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                  </div>
                </StickerCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

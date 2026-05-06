"use client"

import { motion } from "framer-motion"
import {
  GraduationCap,
  Zap,
  CheckCircle,
  Target,
  Brain,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"

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
      <header className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Aide Scolaire</h1>
            <p className="text-zinc-500 text-sm font-medium">Apprends et gagne des XP</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-gen-z-lavender/10 to-purple-500/5 border border-gen-z-lavender/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gen-z-lavender" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">XP Total</span>
            </div>
            <p className="text-2xl font-black text-gen-z-lavender">{totalXP.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-gen-z-mint/10 to-emerald-500/5 border border-gen-z-mint/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-gen-z-mint" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Notes</span>
            </div>
            <p className="text-2xl font-black text-gen-z-mint">{gradeCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-gen-z-coral" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Matières</span>
            </div>
            <p className="text-2xl font-black text-white">{subjects.length}</p>
          </motion.div>
        </div>
      </header>

      {/* Subjects Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Mes Matières</h2>

        {subjects.length === 0 ? (
          <EmptyState
            preset="documents"
            size="default"
            title="Aucune note validée"
            description="Soumets tes notes pour suivi — ton parent les valide et tu gagnes des XP !"
            action={{ label: "Voir mon profil", href: "/teen" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject, idx) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br text-2xl",
                    subject.color
                  )}>
                    {subject.icon}
                  </div>
                  <span className="text-xs text-zinc-500">{subject.gradeCount} note{subject.gradeCount > 1 ? "s" : ""}</span>
                </div>

                <h3 className="font-black text-lg text-white mb-2">{subject.name}</h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    {subject.average !== null
                      ? `Moyenne: ${subject.average}/20`
                      : "Aucune note"}
                  </span>
                  {subject.average !== null && (
                    <span className={cn(
                      "text-sm font-bold",
                      subject.average >= 14 ? "text-gen-z-mint" :
                      subject.average >= 10 ? "text-yellow-500" :
                      "text-gen-z-coral"
                    )}>
                      {subject.average >= 14 ? "Excellent" :
                       subject.average >= 10 ? "Bien" : "À améliorer"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end mt-4">
                  <Button size="sm" variant="ghost" className="text-xs">
                    Voir <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended — no backend yet */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-gen-z-coral" />
          <h2 className="text-xl font-black uppercase">Recommandé pour toi</h2>
        </div>

        {/* No recommendations endpoint yet — show a coming-soon state */}
        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
          <EmptyState
            preset="quests"
            size="small"
            title="Recommandations bientôt disponibles"
            description="Des exercices personnalisés basés sur tes notes arrivent prochainement."
          />
        </div>
      </section>

      {/* Recent Activity — no dedicated endpoint yet */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-gen-z-lavender" />
          <h2 className="text-xl font-black uppercase">Activité Récente</h2>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
          <EmptyState
            preset="feed"
            size="small"
            title="Activité bientôt disponible"
            description="Ton historique d'activités scolaires apparaîtra ici dès que la fonctionnalité sera disponible."
          />
        </div>
      </section>
    </div>
  )
}

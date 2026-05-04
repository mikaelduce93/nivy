"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GraduationCap, BookOpen, Calculator, Globe, Beaker, History, Languages, Zap, Play, Clock, Trophy, Star, Target, Brain, CheckCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// Static subject data
const SUBJECTS = [
  { 
    id: "math", 
    name: "Mathématiques", 
    icon: Calculator, 
    color: "from-blue-500 to-cyan-500",
    progress: 65,
    chaptersCompleted: 8,
    totalChapters: 12,
    xpEarned: 850,
    lastActivity: "Il y a 2h"
  },
  { 
    id: "french", 
    name: "Français", 
    icon: BookOpen, 
    color: "from-purple-500 to-pink-500",
    progress: 45,
    chaptersCompleted: 5,
    totalChapters: 11,
    xpEarned: 520,
    lastActivity: "Hier"
  },
  { 
    id: "physics", 
    name: "Physique-Chimie", 
    icon: Beaker, 
    color: "from-green-500 to-emerald-500",
    progress: 30,
    chaptersCompleted: 3,
    totalChapters: 10,
    xpEarned: 340,
    lastActivity: "Il y a 2 jours"
  },
  { 
    id: "history", 
    name: "Histoire-Géo", 
    icon: History, 
    color: "from-amber-500 to-orange-500",
    progress: 55,
    chaptersCompleted: 6,
    totalChapters: 11,
    xpEarned: 620,
    lastActivity: "Hier"
  },
  { 
    id: "english", 
    name: "Anglais", 
    icon: Languages, 
    color: "from-red-500 to-rose-500",
    progress: 70,
    chaptersCompleted: 7,
    totalChapters: 10,
    xpEarned: 780,
    lastActivity: "Il y a 3h"
  },
  { 
    id: "svt", 
    name: "SVT", 
    icon: Globe, 
    color: "from-teal-500 to-cyan-500",
    progress: 25,
    chaptersCompleted: 2,
    totalChapters: 8,
    xpEarned: 240,
    lastActivity: "Il y a 3 jours"
  },
]

const RECENT_ACTIVITIES = [
  { id: 1, subject: "math", title: "Quiz: Équations 2nd degré", score: 85, xp: 150, time: "Il y a 2h" },
  { id: 2, subject: "english", title: "Exercice: Past Tense", score: 90, xp: 120, time: "Il y a 3h" },
  { id: 3, subject: "history", title: "Révision: WWI", score: 75, xp: 100, time: "Hier" },
]

const RECOMMENDED = [
  { id: 1, subject: "math", title: "Fonctions affines", difficulty: "Moyen", xp: 100, duration: "15 min" },
  { id: 2, subject: "french", title: "Conjugaison passé composé", difficulty: "Facile", xp: 80, duration: "10 min" },
  { id: 3, subject: "physics", title: "Forces et mouvement", difficulty: "Difficile", xp: 150, duration: "20 min" },
]

export default function AcademicPage() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  // Stats
  const totalXP = SUBJECTS.reduce((sum, s) => sum + s.xpEarned, 0)
  const totalChapters = SUBJECTS.reduce((sum, s) => sum + s.chaptersCompleted, 0)
  const averageProgress = Math.round(SUBJECTS.reduce((sum, s) => sum + s.progress, 0) / SUBJECTS.length)

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Aide Scolaire</h1>
                <p className="text-zinc-500 text-sm font-medium">Apprends et gagne des XP</p>
              </div>
            </div>
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
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Chapitres</span>
            </div>
            <p className="text-2xl font-black text-gen-z-mint">{totalChapters}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-gen-z-coral" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Progression</span>
            </div>
            <p className="text-2xl font-black text-white">{averageProgress}%</p>
          </motion.div>
        </div>
      </header>

      {/* Subjects Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Mes Matières</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.map((subject, idx) => {
            const Icon = subject.icon
            
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => setSelectedSubject(subject.id)}
                className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                    subject.color
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs text-zinc-500">{subject.lastActivity}</span>
                </div>

                <h3 className="font-black text-lg text-white mb-2">{subject.name}</h3>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-400">
                    {subject.chaptersCompleted}/{subject.totalChapters} chapitres
                  </span>
                  <span className="text-sm font-bold text-gen-z-lavender">{subject.progress}%</span>
                </div>

                <Progress value={subject.progress} className="h-2 mb-4" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gen-z-lavender">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-sm">{subject.xpEarned} XP</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs">
                    Continuer <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Recommended */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-gen-z-coral" />
          <h2 className="text-xl font-black uppercase">Recommandé pour toi</h2>
        </div>

        <div className="space-y-3">
          {RECOMMENDED.map((item, idx) => {
            const subject = SUBJECTS.find(s => s.id === item.subject)!
            const Icon = subject.icon

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-gen-z-lavender/50 transition-all cursor-pointer"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  subject.color
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">{item.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      item.difficulty === "Facile" ? "bg-gen-z-mint/20 text-gen-z-mint" :
                      item.difficulty === "Moyen" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-gen-z-coral/20 text-gen-z-coral"
                    )}>
                      {item.difficulty}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.duration}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-gen-z-lavender">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">+{item.xp}</span>
                  </div>
                </div>

                <Button size="sm" className="bg-gen-z-lavender text-black font-bold">
                  <Play className="w-4 h-4" />
                </Button>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Activité Récente</h2>

        <div className="space-y-3">
          {RECENT_ACTIVITIES.map((activity, idx) => {
            const subject = SUBJECTS.find(s => s.id === activity.subject)!
            const Icon = subject.icon

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  subject.color
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">{activity.title}</h4>
                  <span className="text-xs text-zinc-500">{activity.time}</span>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "font-black text-lg",
                    activity.score >= 80 ? "text-gen-z-mint" :
                    activity.score >= 60 ? "text-yellow-500" : "text-gen-z-coral"
                  )}>
                    {activity.score}%
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gen-z-lavender">
                    <Zap className="w-3 h-3" />
                    <span>+{activity.xp}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Daily Goal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-gen-z-lavender/10 to-purple-500/5 border border-gen-z-lavender/20"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gen-z-lavender/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-gen-z-lavender" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white">Objectif du jour</h3>
            <p className="text-sm text-zinc-400">Complète 3 exercices pour gagner un bonus</p>
            <Progress value={66} className="h-2 mt-3" />
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-gen-z-lavender">2/3</p>
            <p className="text-xs text-zinc-500">exercices</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Dumbbell, Zap, Flame, Trophy, Clock, Play, Check, Target, Heart, Timer, TrendingUp, Calendar, Star, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// Static physical challenges data
const DAILY_CHALLENGES = [
  { 
    id: "squats", 
    name: "30 Squats", 
    description: "Fais 30 squats avec bonne forme",
    icon: "🏋️", 
    xpReward: 50, 
    completed: true,
    category: "strength"
  },
  { 
    id: "pushups", 
    name: "20 Pompes", 
    description: "20 pompes en une série",
    icon: "💪", 
    xpReward: 75, 
    completed: false,
    category: "strength"
  },
  { 
    id: "plank", 
    name: "Planche 1 min", 
    description: "Tiens la position planche",
    icon: "🧘", 
    xpReward: 60, 
    completed: false,
    category: "core"
  },
  { 
    id: "jumping", 
    name: "50 Jumping Jacks", 
    description: "Cardio avec jumping jacks",
    icon: "⭐", 
    xpReward: 40, 
    completed: true,
    category: "cardio"
  },
]

const CHALLENGE_PROGRAMS = [
  { 
    id: "30-day-fit", 
    name: "30 Jours Fitness", 
    description: "Programme complet de remise en forme",
    duration: "30 jours",
    difficulty: "Moyen",
    xpTotal: 3000,
    progress: 23,
    icon: "🔥"
  },
  { 
    id: "abs-challenge", 
    name: "Défi Abdos", 
    description: "Sculpte tes abdos en 2 semaines",
    duration: "14 jours",
    difficulty: "Difficile",
    xpTotal: 1500,
    progress: 0,
    icon: "💎"
  },
  { 
    id: "cardio-blast", 
    name: "Cardio Blast", 
    description: "Améliore ton endurance",
    duration: "21 jours",
    difficulty: "Facile",
    xpTotal: 2100,
    progress: 0,
    icon: "❤️"
  },
]

const WORKOUT_HISTORY = [
  { id: 1, name: "Full Body", date: "Aujourd'hui", duration: "25 min", xp: 150, completed: true },
  { id: 2, name: "Cardio HIIT", date: "Hier", duration: "20 min", xp: 120, completed: true },
  { id: 3, name: "Upper Body", date: "Il y a 2 jours", duration: "30 min", xp: 180, completed: true },
]

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Dumbbell },
  { id: "strength", label: "Force", icon: Target },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "core", label: "Core", icon: Star },
]

export default function DefisPhysiquesPage() {
  const [category, setCategory] = useState("all")

  // Stats
  const totalWorkouts = 45
  const currentStreak = 7
  const totalXPEarned = 4520
  const minutesThisWeek = 180

  const filteredChallenges = category === "all" 
    ? DAILY_CHALLENGES 
    : DAILY_CHALLENGES.filter(c => c.category === category)

  const completedToday = DAILY_CHALLENGES.filter(c => c.completed).length
  const totalToday = DAILY_CHALLENGES.length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Défis Physiques</h1>
                <p className="text-zinc-500 text-sm font-medium">Bouge et gagne des XP</p>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-black text-orange-500">{currentStreak}</span>
            <span className="text-xs text-orange-500/70">jours</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-black text-xl">{totalWorkouts}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Workouts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gen-z-lavender" />
              <span className="font-black text-xl">{totalXPEarned.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP Total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-gen-z-mint" />
              <span className="font-black text-xl">{minutesThisWeek}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Min/Semaine</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-4 h-4 text-gen-z-coral" />
              <span className="font-black text-xl">{completedToday}/{totalToday}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Aujourd'hui</p>
          </motion.div>
        </div>
      </header>

      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Progression du jour</h3>
          <span className="text-sm text-orange-500 font-bold">{Math.round((completedToday / totalToday) * 100)}%</span>
        </div>
        <Progress value={(completedToday / totalToday) * 100} className="h-3" />
        <p className="text-sm text-zinc-500 mt-3">
          {completedToday === totalToday 
            ? "Bravo! Tu as terminé tous les défis du jour! 🎉" 
            : `${totalToday - completedToday} défis restants pour compléter ta journée`}
        </p>
      </motion.div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                category === cat.id
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Daily Challenges */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Défis du Jour</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChallenges.map((challenge, idx) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative p-6 rounded-3xl border transition-all",
                challenge.completed 
                  ? "bg-gen-z-mint/10 border-gen-z-mint/30" 
                  : "bg-zinc-900/50 border-white/5 hover:border-orange-500/50"
              )}
            >
              {challenge.completed && (
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gen-z-mint flex items-center justify-center">
                  <Check className="w-5 h-5 text-black" />
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="text-5xl">{challenge.icon}</div>
                <div className="flex-1">
                  <h3 className={cn(
                    "font-black text-lg",
                    challenge.completed ? "text-zinc-400 line-through" : "text-white"
                  )}>
                    {challenge.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">{challenge.description}</p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gen-z-lavender" />
                    <span className="font-bold text-gen-z-lavender">+{challenge.xpReward} XP</span>
                  </div>
                </div>
              </div>

              {!challenge.completed && (
                <Button className="w-full mt-4 bg-orange-500 text-black font-bold hover:bg-orange-400">
                  <Play className="w-4 h-4 mr-2" />
                  Commencer
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Programs */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Programmes</h2>

        <div className="space-y-4">
          {CHALLENGE_PROGRAMS.map((program, idx) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-6 rounded-3xl border transition-all cursor-pointer",
                program.progress > 0 
                  ? "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20" 
                  : "bg-zinc-900/50 border-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{program.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-black text-lg text-white">{program.name}</h3>
                    {program.progress > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-[10px] font-bold uppercase">
                        En cours
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">{program.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-3 h-3" />
                      {program.duration}
                    </span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded-full text-xs",
                      program.difficulty === "Facile" ? "bg-gen-z-mint/20 text-gen-z-mint" :
                      program.difficulty === "Moyen" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-gen-z-coral/20 text-gen-z-coral"
                    )}>
                      {program.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-3 h-3" />
                      {program.xpTotal} XP
                    </span>
                  </div>
                  {program.progress > 0 && (
                    <div className="mt-3">
                      <Progress value={program.progress} className="h-2" />
                      <span className="text-xs text-zinc-500 mt-1">{program.progress}% complété</span>
                    </div>
                  )}
                </div>
                <Button variant={program.progress > 0 ? "default" : "outline"}>
                  {program.progress > 0 ? "Continuer" : "Commencer"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workout History */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Historique</h2>

        <div className="space-y-3">
          {WORKOUT_HISTORY.map((workout, idx) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-orange-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{workout.name}</h4>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span>{workout.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {workout.duration}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gen-z-lavender">
                <Zap className="w-4 h-4" />
                <span className="font-bold">+{workout.xp}</span>
              </div>

              <Check className="w-5 h-5 text-gen-z-mint" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <div className="flex gap-4">
        <Button className="flex-1 h-14 bg-orange-500 text-black font-bold hover:bg-orange-400">
          <Play className="w-5 h-5 mr-2" />
          Workout Rapide
        </Button>
        <Button variant="outline" className="flex-1 h-14">
          <TrendingUp className="w-5 h-5 mr-2" />
          Mes Stats
        </Button>
      </div>
    </div>
  )
}

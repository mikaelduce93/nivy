'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Star, Users, Zap, Lock, CheckCircle2, 
  Flame, Gift, Trophy, Sparkles, Play, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { NeonButton } from '@/components/ui/neon-button'
import { QuestCard, QuestType } from '@/components/gamification/quest-card'
import { StreakCounter } from '@/components/gamification/streak-counter'
import { QuestConfetti } from '@/components/ui/effects/confetti'

// Types
interface CalendarDay {
  date: string
  dayNumber: number
  dayName: string
  ritualType?: 'quiz_boost' | 'passion_day' | 'crew_day' | 'event_weekend'
  status: 'locked' | 'active' | 'completed'
  xpReward: number
  quests: Quest[]
}

interface Quest {
  id: string
  title: string
  type: QuestType
  xpReward: number
  progress: number
  status: 'locked' | 'active' | 'in_progress' | 'completed' | 'claimed'
}

// Season Header
function SeasonHeader() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden h-56 mb-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" />
      <motion.div 
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'url(/grid.svg)', backgroundSize: '30px 30px' }}
        animate={{ backgroundPosition: ['0px 0px', '30px 30px'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div 
        className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/40 rounded-full blur-[100px]"
        animate={{ x: [0, 20, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/40 rounded-full blur-[100px]"
        animate={{ x: [0, -20, 0], y: [0, 20, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-8">
        <motion.span 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-cyan-300 backdrop-blur-sm mb-4 w-fit"
        >
          <Star className="w-3 h-3 fill-cyan-300" />
          Saison Active
        </motion.span>

        <motion.h1 
          className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-purple-200">
            Back to School
          </span>
        </motion.h1>

        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-indigo-200 font-medium">Semaine 2 • Progression</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                initial={{ width: 0 }}
                animate={{ width: '45%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <span className="text-xs text-indigo-300 font-bold">45%</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Week Navigator
function WeekNavigator({ days, selectedDay, onSelect }: { days: CalendarDay[], selectedDay: number, onSelect: (i: number) => void }) {
  const getConfig = (ritual?: CalendarDay['ritualType']) => {
    switch (ritual) {
      case 'quiz_boost': return { icon: Zap, color: 'yellow' }
      case 'passion_day': return { icon: Sparkles, color: 'purple' }
      case 'crew_day': return { icon: Users, color: 'green' }
      case 'event_weekend': return { icon: Star, color: 'pink' }
      default: return { icon: Calendar, color: 'zinc' }
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Ta Semaine
        </h2>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <motion.span 
            className="w-2 h-2 rounded-full bg-cyan-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          En direct
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {days.map((day, idx) => {
          const config = getConfig(day.ritualType)
          const Icon = config.icon
          const isSelected = idx === selectedDay
          const isActive = day.status === 'active'
          const isCompleted = day.status === 'completed'

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(idx)}
              className={cn(
                "relative flex-shrink-0 w-20 flex flex-col items-center p-3 rounded-2xl border transition-all duration-300",
                isSelected ? "bg-white/10 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]" : 
                isActive ? "bg-cyan-500/10 border-cyan-500/30" :
                isCompleted ? "bg-green-500/10 border-green-500/30" :
                "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"
              )}
            >
              {isActive && (
                <motion.div 
                  className="absolute -inset-0.5 rounded-2xl border-2 border-cyan-400/50"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              <span className={cn(
                "text-xs font-medium uppercase tracking-wider mb-2",
                isActive ? "text-cyan-300" : isCompleted ? "text-green-400" : "text-zinc-500"
              )}>
                {day.dayName}
              </span>

              <div className={cn("relative w-12 h-12 rounded-xl flex items-center justify-center mb-2", `bg-${config.color}-500/20`)}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : day.status === 'locked' ? (
                  <Lock className="w-4 h-4 text-zinc-600" />
                ) : (
                  <Icon className={cn("w-5 h-5", `text-${config.color}-400`)} />
                )}
                
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 rounded-xl border-2 border-cyan-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>

              <span className={cn("text-[10px] font-bold", isCompleted ? "text-green-400" : isActive ? "text-cyan-400" : "text-zinc-600")}>
                +{day.xpReward} XP
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Crew Pulse Widget
function CrewPulse() {
  const progress = 69
  return (
    <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
      <div className="bg-green-500/20 p-2 rounded-lg z-10">
        <Users className="w-4 h-4 text-green-400" />
      </div>
      <div className="flex-1 z-10">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-green-300">Objectif Crew</span>
          <span className="text-[10px] text-green-400 font-mono">3,450 / 5,000 XP</span>
        </div>
        <div className="h-1.5 bg-green-950 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
          />
        </div>
      </div>
      <TrendingUp className="w-4 h-4 text-green-500 opacity-50 z-10" />
    </div>
  )
}

// Main Page
export default function PreviewCalendarPage() {
  const [selectedDay, setSelectedDay] = useState(2)
  const [showConfetti, setShowConfetti] = useState(false)

  // Mock data
  const days: CalendarDay[] = [
    { date: '2026-01-12', dayNumber: 12, dayName: 'Lun', ritualType: 'quiz_boost', status: 'completed', xpReward: 75, quests: [] },
    { date: '2026-01-13', dayNumber: 13, dayName: 'Mar', status: 'completed', xpReward: 50, quests: [] },
    { date: '2026-01-14', dayNumber: 14, dayName: 'Mer', ritualType: 'passion_day', status: 'active', xpReward: 100, quests: [
      { id: '1', title: 'Quiz Express Culture', type: 'quiz', xpReward: 50, progress: 60, status: 'in_progress' },
      { id: '2', title: 'Création du jour', type: 'creative', xpReward: 75, progress: 0, status: 'active' },
    ] },
    { date: '2026-01-15', dayNumber: 15, dayName: 'Jeu', status: 'locked', xpReward: 50, quests: [] },
    { date: '2026-01-16', dayNumber: 16, dayName: 'Ven', ritualType: 'crew_day', status: 'locked', xpReward: 150, quests: [] },
    { date: '2026-01-17', dayNumber: 17, dayName: 'Sam', ritualType: 'event_weekend', status: 'locked', xpReward: 200, quests: [] },
    { date: '2026-01-18', dayNumber: 18, dayName: 'Dim', ritualType: 'event_weekend', status: 'locked', xpReward: 200, quests: [] },
  ]

  useEffect(() => {
    setTimeout(() => setShowConfetti(true), 2000)
  }, [])

  const currentDay = days[selectedDay]

  return (
    <div className="min-h-screen bg-zinc-950">
      <QuestConfetti trigger={showConfetti} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Demo Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-center"
        >
          <span className="text-sm text-purple-300">🎨 PREVIEW MODE - Design Snapchat-Level</span>
        </motion.div>

        {/* Season Header */}
        <SeasonHeader />

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StreakCounter 
            currentStreak={5} 
            multiplier={1.2}
            nextMilestone={2}
          />
          <CrewPulse />
        </div>

        {/* Week Navigator */}
        <WeekNavigator 
          days={days} 
          selectedDay={selectedDay}
          onSelect={setSelectedDay}
        />

        {/* Day Quests */}
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {currentDay.dayName} {currentDay.dayNumber}
              </h3>
              <p className="text-sm text-zinc-400">
                {currentDay.quests.length} quête{currentDay.quests.length !== 1 ? 's' : ''} disponible{currentDay.quests.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-400">+{currentDay.xpReward} XP</span>
            </div>
          </div>

          {currentDay.quests.length > 0 ? (
            currentDay.quests.map((quest, idx) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <QuestCard {...quest} />
              </motion.div>
            ))
          ) : (
            <GlassCard className="p-6 text-center">
              <Gift className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">
                {currentDay.status === 'completed' ? 'Journée terminée !' : 'Quêtes à venir...'}
              </p>
            </GlassCard>
          )}
        </motion.div>

        {/* Weekly Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <GlassCard neon="intellect" className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Progression Hebdomadaire
                </h3>
                <p className="text-sm text-zinc-400">
                  Complete toutes les quêtes pour le <span className="text-yellow-400 font-bold">Coffre Légendaire</span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 md:w-48">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Progression</span>
                    <span>2/7</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '28%' }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
                <Gift className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}



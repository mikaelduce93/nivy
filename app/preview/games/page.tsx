'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gamepad2, Music, Brain, Dices, Target, Trophy, Zap, Users, 
  Star, Sparkles, Flame, Gift, Play, TrendingUp, Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { NeonButton } from '@/components/ui/neon-button'
import Link from 'next/link'

// Types & Data
interface MiniGame {
  id: string
  name: string
  description: string
  icon: typeof Gamepad2
  bgGradient: string
  xpReward: { min: number, max: number }
  playersOnline?: number
  isLive?: boolean
  isNew?: boolean
  category: string
  bestScore?: number
}

const MINI_GAMES: MiniGame[] = [
  { id: 'music-quiz', name: 'Music Quiz', description: 'Devine le titre ou l\'artiste', icon: Music, bgGradient: 'from-pink-500 via-rose-500 to-red-500', xpReward: { min: 25, max: 100 }, playersOnline: 234, isLive: true, category: 'quiz', bestScore: 850 },
  { id: 'brain-teaser', name: 'Brain Teaser', description: 'Énigmes et défis logiques', icon: Brain, bgGradient: 'from-purple-500 via-violet-500 to-indigo-500', xpReward: { min: 30, max: 150 }, playersOnline: 156, category: 'quiz', bestScore: 1200 },
  { id: 'memory-match', name: 'Memory Match', description: 'Trouve les paires rapidement', icon: Dices, bgGradient: 'from-cyan-500 via-teal-500 to-emerald-500', xpReward: { min: 20, max: 80 }, playersOnline: 89, isNew: true, category: 'memory' },
  { id: 'reflex-master', name: 'Reflex Master', description: 'Teste ta vitesse de réaction', icon: Target, bgGradient: 'from-orange-500 via-amber-500 to-yellow-500', xpReward: { min: 15, max: 60 }, category: 'reflex', bestScore: 420 },
  { id: 'predictions', name: 'Predictions', description: 'Prédit les résultats', icon: TrendingUp, bgGradient: 'from-emerald-500 via-green-500 to-lime-500', xpReward: { min: 50, max: 200 }, playersOnline: 412, category: 'prediction' },
  { id: 'duel-quiz', name: 'Duel Quiz', description: 'Affronte tes amis en temps réel', icon: Users, bgGradient: 'from-blue-500 via-indigo-500 to-purple-500', xpReward: { min: 40, max: 120 }, playersOnline: 78, category: 'social' },
]

// Live Event Banner
function LiveEventBanner() {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
      <motion.div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
      
      {[...Array(8)].map((_, i) => (
        <motion.div key={i} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, delay: Math.random() * 2, repeat: Infinity }}>
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
      ))}

      <div className="relative z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Flame className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <motion.span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase text-white" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>LIVE</motion.span>
              <span className="text-white/80 text-sm">1,234 joueurs</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">Marathon XP du Weekend</h2>
            <p className="text-white/80 text-sm">Double XP sur tous les jeux !</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs text-white/60 uppercase">Temps restant</span>
            <span className="text-2xl font-black text-white">23h 45m</span>
          </div>
          <motion.div className="px-4 py-2 rounded-full bg-white text-orange-600 font-black text-lg" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>x2</motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// Game Card
function GameCard({ game, index }: { game: MiniGame, index: number }) {
  const Icon = game.icon
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <GlassCard variant="hover" className="relative h-full overflow-hidden cursor-pointer group">
        <div className={cn("absolute inset-0 opacity-20", `bg-gradient-to-br ${game.bgGradient}`)} />
        
        {game.isLive && (
          <motion.div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[10px] font-bold text-white uppercase">Live</span>
          </motion.div>
        )}
        
        {game.isNew && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-cyan-500">
            <span className="text-[10px] font-bold text-white uppercase">New</span>
          </div>
        )}

        <div className="relative z-0 p-5">
          <motion.div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", `bg-gradient-to-br ${game.bgGradient}`)} animate={game.isLive ? { boxShadow: ['0 0 20px rgba(255,255,255,0.2)', '0 0 40px rgba(255,255,255,0.4)', '0 0 20px rgba(255,255,255,0.2)'] } : {}} transition={{ duration: 2, repeat: Infinity }}>
            <Icon className="w-7 h-7 text-white" />
          </motion.div>

          <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
          <p className="text-sm text-zinc-400 mb-4">{game.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-emerald-400 text-sm">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{game.xpReward.min}-{game.xpReward.max}</span>
              </div>
              {game.playersOnline && (
                <div className="flex items-center gap-1 text-zinc-500 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{game.playersOnline}</span>
                </div>
              )}
            </div>
            {game.bestScore && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                <Crown className="w-3 h-3" />
                {game.bestScore}
              </div>
            )}
          </div>
        </div>

        <motion.div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.div className="p-4 rounded-full bg-white/20 backdrop-blur-sm" whileHover={{ scale: 1.1 }}>
            <Play className="w-8 h-8 text-white fill-white" />
          </motion.div>
        </motion.div>
      </GlassCard>
    </motion.div>
  )
}

// Category Filter
function CategoryFilter({ selected, onSelect }: { selected: string, onSelect: (s: string) => void }) {
  const categories = [
    { id: 'all', label: 'Tous', icon: Gamepad2 },
    { id: 'quiz', label: 'Quiz', icon: Brain },
    { id: 'memory', label: 'Mémoire', icon: Dices },
    { id: 'reflex', label: 'Réflexe', icon: Target },
    { id: 'social', label: 'Multijoueur', icon: Users },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
      {categories.map((cat) => {
        const Icon = cat.icon
        return (
          <motion.button key={cat.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSelect(cat.id)} className={cn("flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-all", selected === cat.id ? "bg-white text-black border-white" : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600")}>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{cat.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// Leaderboard Widget
function LeaderboardWidget() {
  const topPlayers = [
    { rank: 1, name: 'Yasmine K.', score: 12500, avatar: '👸' },
    { rank: 2, name: 'Adam M.', score: 11200, avatar: '🧑‍🎤' },
    { rank: 3, name: 'Sara L.', score: 10800, avatar: '🦸‍♀️' },
  ]

  return (
    <GlassCard neon="prestige" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Joueurs
        </h3>
      </div>
      <div className="space-y-3">
        {topPlayers.map((player, idx) => (
          <motion.div key={player.rank} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-3">
            <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black", idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-zinc-400 text-black" : "bg-amber-700 text-white")}>{player.rank}</span>
            <span className="text-2xl">{player.avatar}</span>
            <span className="flex-1 font-medium text-white truncate">{player.name}</span>
            <span className="text-sm font-bold text-emerald-400">{player.score.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  )
}

// Main Page
export default function PreviewGamesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const filteredGames = selectedCategory === 'all' ? MINI_GAMES : MINI_GAMES.filter(g => g.category === selectedCategory)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Demo Badge */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-center">
          <span className="text-sm text-emerald-300">🎮 PREVIEW MODE - Game Zone Snapchat-Level</span>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 mb-2">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
            Game Zone
          </h1>
          <p className="text-zinc-400">Joue, gagne des XP, et grimpe dans le classement !</p>
        </motion.div>

        {/* Live Event */}
        <LiveEventBanner />

        {/* Category Filter */}
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="wait">
                {filteredGames.map((game, idx) => (
                  <GameCard key={game.id} game={game} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-4">
            <LeaderboardWidget />

            <GlassCard neon="vitality" className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Défi du Jour</h3>
                  <p className="text-xs text-zinc-500">Renouvellement dans 4h</p>
                </div>
              </div>
              <p className="text-sm text-zinc-300 mb-4">Obtiens un score parfait dans <span className="text-emerald-400 font-bold">Music Quiz</span></p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-white">+500 XP</span>
                </div>
                <NeonButton variant="vitality" size="sm">Jouer</NeonButton>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-400" />
                Tes Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                  <span className="block text-2xl font-black text-white">42</span>
                  <span className="text-xs text-zinc-500">Parties</span>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                  <span className="block text-2xl font-black text-emerald-400">3,450</span>
                  <span className="text-xs text-zinc-500">XP gagnés</span>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                  <span className="block text-2xl font-black text-yellow-400">78%</span>
                  <span className="text-xs text-zinc-500">Victoires</span>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                  <span className="block text-2xl font-black text-purple-400">#23</span>
                  <span className="text-xs text-zinc-500">Classement</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}



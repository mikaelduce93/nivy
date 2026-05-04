"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Brain, Zap, Trophy, Clock, Star, Play, BookOpen, Calculator, Globe, Beaker, History, Music, Target, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// Static quiz data
const QUIZ_CATEGORIES = [
  { id: "math", name: "Mathématiques", icon: Calculator, color: "from-blue-500 to-cyan-500", quizzes: 12, completed: 5 },
  { id: "science", name: "Sciences", icon: Beaker, color: "from-green-500 to-emerald-500", quizzes: 10, completed: 3 },
  { id: "history", name: "Histoire", icon: History, color: "from-amber-500 to-orange-500", quizzes: 8, completed: 2 },
  { id: "geography", name: "Géographie", icon: Globe, color: "from-cyan-500 to-blue-500", quizzes: 9, completed: 4 },
  { id: "french", name: "Français", icon: BookOpen, color: "from-purple-500 to-pink-500", quizzes: 11, completed: 6 },
  { id: "culture", name: "Culture Générale", icon: Star, color: "from-yellow-500 to-amber-500", quizzes: 15, completed: 7 },
]

const RECENT_QUIZZES = [
  { id: 1, title: "Équations du 2nd degré", category: "math", score: 85, xp: 150, time: "Il y a 2h" },
  { id: 2, title: "La Révolution Française", category: "history", score: 70, xp: 100, time: "Hier" },
  { id: 3, title: "Système Solaire", category: "science", score: 95, xp: 180, time: "Hier" },
  { id: 4, title: "Capitales du Monde", category: "geography", score: 100, xp: 200, time: "Il y a 2 jours" },
]

const DAILY_CHALLENGE = {
  title: "Quiz du Jour",
  description: "10 questions variées pour tester tes connaissances",
  xpReward: 100,
  bonusXp: 50,
  timeLimit: "5 min",
  completed: false,
}

export default function QuizPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Stats
  const totalCompleted = QUIZ_CATEGORIES.reduce((sum, cat) => sum + cat.completed, 0)
  const totalQuizzes = QUIZ_CATEGORIES.reduce((sum, cat) => sum + cat.quizzes, 0)
  const averageScore = 82
  const totalXpEarned = 2450

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Quiz</h1>
                <p className="text-zinc-500 text-sm font-medium">Teste tes connaissances</p>
              </div>
            </div>
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
              <CheckCircle className="w-4 h-4 text-gen-z-mint" />
              <span className="font-black text-xl">{totalCompleted}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Complétés</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-4 h-4 text-gen-z-coral" />
              <span className="font-black text-xl">{averageScore}%</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Moyenne</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gen-z-lavender" />
              <span className="font-black text-xl">{totalXpEarned.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP Total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-black text-xl">3</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">100%</p>
          </motion.div>
        </div>
      </header>

      {/* Daily Challenge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-gen-z-lavender/20 to-purple-500/10 border border-gen-z-lavender/30"
      >
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gen-z-lavender/20 text-gen-z-lavender text-xs font-black uppercase">
          Quotidien
        </div>
        
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
            <Brain className="w-10 h-10 text-black" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-1">{DAILY_CHALLENGE.title}</h3>
            <p className="text-zinc-400 mb-4">{DAILY_CHALLENGE.description}</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gen-z-lavender" />
                <span className="font-bold text-gen-z-lavender">+{DAILY_CHALLENGE.xpReward} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-yellow-500">+{DAILY_CHALLENGE.bonusXp} bonus</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-400">{DAILY_CHALLENGE.timeLimit}</span>
              </div>
            </div>
          </div>
          <Button className="bg-gen-z-lavender text-black font-bold hover:bg-gen-z-lavender/80">
            <Play className="w-4 h-4 mr-2" />
            Commencer
          </Button>
        </div>
      </motion.div>

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Catégories</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {QUIZ_CATEGORIES.map((category, idx) => {
            const Icon = category.icon
            const progress = (category.completed / category.quizzes) * 100
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => setSelectedCategory(category.id)}
                className="relative p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br",
                  category.color
                )}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="font-black text-lg text-white mb-1">{category.name}</h3>
                <p className="text-sm text-zinc-400 mb-4">{category.completed}/{category.quizzes} quiz</p>
                
                <Progress value={progress} className="h-2" />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Recent Quizzes */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Récents</h2>
        
        <div className="space-y-3">
          {RECENT_QUIZZES.map((quiz, idx) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-gen-z-lavender/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-gen-z-lavender" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{quiz.title}</h4>
                <p className="text-sm text-zinc-400 capitalize">{quiz.category}</p>
              </div>

              <div className="text-right">
                <div className={cn(
                  "font-black text-lg",
                  quiz.score >= 90 ? "text-gen-z-mint" :
                  quiz.score >= 70 ? "text-yellow-500" : "text-gen-z-coral"
                )}>
                  {quiz.score}%
                </div>
                <div className="flex items-center gap-1 text-xs text-gen-z-lavender">
                  <Zap className="w-3 h-3" />
                  <span>+{quiz.xp}</span>
                </div>
              </div>

              <span className="text-xs text-zinc-500 shrink-0">{quiz.time}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <div className="flex gap-4">
        <Button className="flex-1 h-14 bg-gen-z-lavender text-black font-bold">
          <Play className="w-5 h-5 mr-2" />
          Quiz Aléatoire
        </Button>
        <Button variant="outline" className="flex-1 h-14">
          <Trophy className="w-5 h-5 mr-2" />
          Classement Quiz
        </Button>
      </div>
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { QuestCard } from "./quest-card"
import { AIOracleCard } from "./ai-oracle-card"
import { type UnifiedQuest } from "@/lib/server/unified-quest-engine"
import { Sparkles, TrendingUp } from "lucide-react"

interface UnifiedQuestFeedProps {
  quests: UnifiedQuest[]
}

export function UnifiedQuestFeed({ quests }: UnifiedQuestFeedProps) {
  if (!quests || quests.length === 0) {
    return (
      <div className="py-12 sm:py-16 md:py-20 text-center space-y-4 sm:space-y-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-zinc-600" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-wider sm:tracking-widest text-xs sm:text-sm px-4">No active quests found in thy area.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-12 md:space-y-16">
      {/* AI Oracle Special Suggestion */}
      <AIOracleCard />

      <div className="space-y-6 sm:space-y-8 md:space-y-10">
        <div className="flex items-center justify-between px-2 sm:px-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-soft/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-brand-soft" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">The Feed</h2>
              <p className="text-zinc-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Latest neighborhood quêtes</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <span className="px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest">
              {quests.length} Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {quests.map((quest, idx) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 200, damping: 20 }}
            >
              <QuestCard quest={quest} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

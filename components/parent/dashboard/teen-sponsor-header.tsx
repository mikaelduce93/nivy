'use client'

import { motion } from 'framer-motion'
import { Plus, ChevronRight, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeenSponsorHeaderProps {
  teens: any[]
}

export function TeenSponsorHeader({ teens }: TeenSponsorHeaderProps) {
  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-4 no-scrollbar">
      {/* Add New Teen Bubble */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex-shrink-0 flex flex-col items-center gap-3"
      >
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center hover:border-gen-z-teal/50 transition-colors">
          <Plus className="w-8 h-8 text-zinc-500" />
        </div>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Connect</span>
      </motion.button>

      {/* Teen Avatars */}
      {teens.map((teen, i) => (
        <motion.button
          key={teen.teen_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 flex flex-col items-center gap-3 group"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-gen-z-teal/20 p-1 group-hover:border-gen-z-teal transition-all duration-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                <img src={teen.avatar_url || '/placeholder-user.jpg'} alt={teen.full_name} className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Status Badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gen-z-teal flex items-center justify-center border-4 border-[#020408] shadow-lg">
              <Zap className="w-3 h-3 text-black fill-current" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-black text-white tracking-tight uppercase leading-none">{teen.full_name?.split(" ")[0]}</span>
            <span className="text-[8px] font-bold text-gen-z-teal uppercase tracking-widest mt-1">Lvl {teen.level || 1}</span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

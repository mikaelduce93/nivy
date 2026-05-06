"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { User, Dumbbell, Brain, Zap, Crown } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { cn } from "@/lib/utils"

interface PillarStats {
  level: number
  currentXP: number
  maxXP: number
}

interface AvatarDashboardProps {
  user: {
    username: string
    avatarUrl?: string
    globalLevel: number
  }
  stats: {
    party: PillarStats
    vitality: PillarStats
    intellect: PillarStats
    prestige: PillarStats
  }
}

export function AvatarDashboard({ user, stats }: AvatarDashboardProps) {
  const pillars = [
    {
      id: "vitality" as const,
      icon: Dumbbell,
      label: "Vitality",
      color: "text-green-400",
      neonColor: "var(--neon-vitality)",
      data: stats.vitality,
      angle: -135, // Top Left
    },
    {
      id: "intellect" as const,
      icon: Brain,
      label: "Intellect",
      color: "text-cyan-400",
      neonColor: "var(--neon-intellect)",
      data: stats.intellect,
      angle: -45, // Top Right
    },
    {
      id: "party" as const,
      icon: Zap,
      label: "Social",
      color: "text-purple-400",
      neonColor: "var(--neon-party)",
      data: stats.party,
      angle: 135, // Bottom Left
    },
    {
      id: "prestige" as const,
      icon: Crown,
      label: "Prestige",
      color: "text-yellow-400",
      neonColor: "var(--neon-prestige)",
      data: stats.prestige,
      angle: 45, // Bottom Right
    },
  ]

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square flex items-center justify-center py-10">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl opacity-50" />

      {/* Center Avatar */}
      <div className="relative z-20">
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-zinc-800 to-zinc-700 shadow-2xl">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-900 relative">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                fill
                sizes="(max-width: 768px) 128px, 160px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <User className="w-12 h-12 text-zinc-500" />
              </div>
            )}
            {/* Level Badge */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-700 shadow-lg">
              <span className="text-white font-black text-sm">LVL {user.globalLevel}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">{user.username}</h2>
          <p className="text-zinc-400 text-sm font-medium">Life RPG Player</p>
        </div>
      </div>

      {/* Pillar Gauges */}
      {pillars.map((pillar) => {
        const progress = (pillar.data.currentXP / pillar.data.maxXP) * 100
        // Calculate position based on angle
        // Using fixed positions for simplicity and responsiveness instead of absolute math
        const positionClasses: Record<typeof pillar.id, string> = {
          vitality: "top-0 left-0 -translate-x-2 -translate-y-2",
          intellect: "top-0 right-0 translate-x-2 -translate-y-2",
          party: "bottom-0 left-0 -translate-x-2 translate-y-12",
          prestige: "bottom-0 right-0 translate-x-2 translate-y-12",
        }

        return (
          <GlassCard
            key={pillar.id}
            intensity="low"
            className={cn(
              "absolute w-28 h-28 md:w-32 md:h-32 flex flex-col items-center justify-center p-2 backdrop-blur-md",
              positionClasses[pillar.id]
            )}
            style={{
              borderColor: pillar.color.replace('text-', 'var(--color-') + ')', // Fallback or sophisticated mapping needed
              boxShadow: `0 0 20px -10px ${pillar.neonColor}`
            }}
          >
            <div className="relative w-16 h-16 mb-1">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-zinc-800"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className={pillar.color}
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 - (progress / 100) * (2 * Math.PI * 28)}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 28 - (progress / 100) * (2 * Math.PI * 28) }}
                  transition={{ duration: 1, delay: 0.2 }}
                  style={{ filter: `drop-shadow(0 0 4px ${pillar.neonColor})` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <pillar.icon className={cn("w-6 h-6", pillar.color)} />
              </div>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-bold uppercase tracking-wider", pillar.color)}>
                {pillar.label}
              </p>
              <p className="text-white font-black text-lg">{pillar.data.level}</p>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}













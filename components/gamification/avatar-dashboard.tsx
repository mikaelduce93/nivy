"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { User, Dumbbell, Brain, Zap, Crown } from "lucide-react"
import { Card } from "@/components/ui/card"
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
      label: "Glow Up",
      color: "text-lime",
      data: stats.vitality,
      angle: -135, // Top Left
    },
    {
      id: "intellect" as const,
      icon: Brain,
      label: "Big Brain",
      color: "text-teal",
      data: stats.intellect,
      angle: -45, // Top Right
    },
    {
      id: "party" as const,
      icon: Zap,
      label: "Main Character",
      color: "text-pink",
      data: stats.party,
      angle: 135, // Bottom Left
    },
    {
      id: "prestige" as const,
      icon: Crown,
      label: "Prestige",
      color: "text-gold",
      data: stats.prestige,
      angle: 45, // Bottom Right
    },
  ]

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square flex items-center justify-center py-10">
      {/* Center Avatar */}
      <div className="relative z-20">
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-paper-2 to-card border-2 border-ink">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-ink relative">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                fill
                sizes="(max-width: 768px) 128px, 160px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-card flex items-center justify-center">
                <User className="w-12 h-12 text-mute" />
              </div>
            )}
            {/* Level Badge */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-card px-3 py-1 rounded-full border-2 border-ink">
              <span className="text-ink font-black text-sm">Niv. {user.globalLevel}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-black text-ink tracking-tight">{user.username}</h2>
          <p className="text-mute text-sm font-medium">Profil de jeu</p>
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
          <Card
            key={pillar.id}
            padding="none"
            className={cn(
              "absolute w-28 h-28 md:w-32 md:h-32 flex flex-col items-center justify-center gap-0 p-2",
              positionClasses[pillar.id]
            )}
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
                  className="text-ink"
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
              <p className="text-ink font-black text-lg">{pillar.data.level}</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}













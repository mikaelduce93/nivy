'use client'

import Image from 'next/image'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Share2, Crown, Zap, Shield, Camera } from 'lucide-react'
import { DarkSurface } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { ParentLinkQR } from '@/components/teen/parent-link-qr'
import { toast } from 'sonner'

interface TeenIDCardProps {
  user: {
    fullName: string
    pseudo?: string
    avatarUrl?: string
    level: number
    role: string
  }
  xpData: {
    total: number
    progressPercent: number
  }
}

export function TeenIDCard({ user, xpData }: TeenIDCardProps) {
  // 3D Tilt Effect
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  function handleMouse(event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(event.clientX - centerX)
    y.set(event.clientY - centerY)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const handleShare = () => {
    toast.success("Identity Card exportée vers Instagram Stories !")
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      <motion.div
        onMouseMove={handleMouse}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        className="relative w-[340px] h-[500px] rounded-[2.5rem] bg-card border border-ink shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden group cursor-pointer"
      >
        {/* Holographic Shimmer Background */}
        <motion.div
          animate={{ 
            backgroundPosition: ["0% 0%", "200% 200%"]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%]"
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-8 items-center text-center justify-between" style={{ transform: "translateZ(50px)" }}>
          {/* Header */}
          <div className="flex justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-brand-soft/20 flex items-center justify-center border border-ink">
              <Shield className="w-5 h-5 text-brand-soft" />
            </div>
            <DarkSurface
              tone={user.level > 10 ? "gold" : "teal"}
              className="flex items-center px-3 py-2"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper">
                Identité vérifiée
              </span>
            </DarkSurface>
          </div>

          {/* Avatar & Info */}
          <div className="space-y-4">
            <div className="relative mx-auto">
              <div className="relative w-32 h-32 rounded-full border-4 border-ink bg-card overflow-hidden shadow-stkr-md">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.fullName}
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card">
                    <Camera className="w-10 h-10 text-mute" />
                  </div>
                )}
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center border-4 border-ink shadow-xl"
              >
                <Crown className="w-5 h-5 text-ink" />
              </motion.div>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-ink tracking-tighter uppercase">{user.fullName}</h3>
              <p className="text-mute font-bold text-xs uppercase tracking-[0.3em]">@{user.pseudo || "noteen"}</p>
            </div>
          </div>

          {/* XP & Stats Bar */}
          <div className="w-full space-y-2 px-4">
            <div className="flex justify-between text-[10px] font-black uppercase text-mute tracking-[0.2em]">
              <span>Level {user.level}</span>
              <span>{xpData.total} XP</span>
            </div>
            <div className="h-2 w-full bg-paper-2 rounded-full overflow-hidden border border-ink">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpData.progressPercent}%` }}
                className="h-full bg-gradient-to-r from-brand-soft to-info-soft"
              />
            </div>
          </div>

          {/* QR Code Section — real scannable parent-link QR (#297). */}
          <div className="relative flex flex-col items-center">
            <ParentLinkQR compact />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em] text-mute">Scan to Link</p>
          </div>
        </div>

        {/* Footer Accent */}
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-brand-soft via-accent-soft to-success-soft" />
      </motion.div>

      {/* Social Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={handleShare}
          className="h-14 px-8 rounded-2xl bg-white/[0.05] border border-ink hover:bg-paper-2 text-ink font-bold flex items-center gap-3 shadow-xl  transition-all"
        >
          <Share2 className="w-5 h-5 text-brand-soft" />
          SHARE STORY
        </Button>
        <Button 
          variant="outline"
          className="h-14 w-14 rounded-2xl border-ink bg-white/[0.05] flex items-center justify-center hover:bg-paper-2"
        >
          <Zap className="w-6 h-6 text-gold" />
        </Button>
      </div>
    </div>
  )
}

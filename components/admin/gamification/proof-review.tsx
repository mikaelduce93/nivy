'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { X, Check, MoreHorizontal, User, AlertCircle, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Proof {
  id: string
  video_url: string
  user: {
    username: string
    avatar_url?: string
    level: number
  }
  challenge: {
    title: string
    criteria: string[]
    xp: number
  }
  created_at: string
}

interface ProofReviewCardProps {
  proof: Proof
  onReview: (id: string, status: 'approved' | 'rejected', reason?: string) => void
}

export function ProofReviewCard({ proof, onReview }: ProofReviewCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const videoRef = useState<HTMLVideoElement | null>(null)
  const controls = useAnimation()

  const handleSwipe = async (dir: 'left' | 'right') => {
    setDirection(dir)
    await controls.start({
      x: dir === 'left' ? -500 : 500,
      rotate: dir === 'left' ? -20 : 20,
      opacity: 0,
      transition: { duration: 0.3 }
    })
    onReview(proof.id, dir === 'right' ? 'approved' : 'rejected')
  }

  const togglePlay = () => {
    const video = document.getElementById(`video-${proof.id}`) as HTMLVideoElement
    if (video) {
      if (video.paused) {
        video.play()
        setIsPlaying(true)
      } else {
        video.pause()
        setIsPlaying(false)
      }
    }
  }

  return (
    <motion.div
      animate={controls}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) handleSwipe('right')
        else if (info.offset.x < -100) handleSwipe('left')
      }}
      className="relative w-full max-w-sm aspect-[9/16] bg-ink rounded-2xl overflow-hidden shadow-2xl border border-ink touch-none mx-auto"
    >
      {/* Video Layer */}
      <div className="absolute inset-0" onClick={togglePlay}>
        <video
          id={`video-${proof.id}`}
          src={proof.video_url}
          className="w-full h-full object-cover"
          loop
          playsInline
        >
          <track kind="captions" srcLang="fr" label="Francais" />
        </video>
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/20 -[2px]">
            <div className="w-16 h-16 rounded-full bg-paper-2  flex items-center justify-center">
              <Play className="w-8 h-8 text-ink ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Overlay Info */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="border-2 border-ink">
              <AvatarImage src={proof.user.avatar_url} />
              <AvatarFallback>{proof.user.username[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-ink/40  px-3 py-1.5 rounded-full">
              <p className="text-ink font-bold text-sm shadow-black drop-shadow-md">
                {proof.user.username} <span className="text-pink">Lvl {proof.user.level}</span>
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-ink hover:bg-paper-2 pointer-events-auto rounded-full"
            aria-label="Plus d'options"
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </div>

        {/* Challenge Criteria & Actions */}
        <div className="space-y-4">
          <div className="bg-ink/60  rounded-2xl p-4 border border-ink">
            <h3 className="text-ink font-bold mb-2 flex items-center gap-2">
              <span className="text-gold">🏆</span> {proof.challenge.title}
            </h3>
            <ul className="space-y-1">
              {proof.challenge.criteria.map((c, i) => (
                <li key={i} className="text-xs text-ink-2 flex items-start gap-2">
                  <span className="mt-0.5">•</span> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4 pointer-events-auto">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 bg-ink/40 border-destructive/50 text-destructive hover:bg-destructive hover:text-ink h-14 rounded-2xl text-lg font-bold transition-all hover:scale-105"
              onClick={() => handleSwipe('left')}
            >
              <X className="w-6 h-6 mr-2" /> Rejeter
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-lime hover:bg-lime text-ink h-14 rounded-2xl text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-lime/20"
              onClick={() => handleSwipe('right')}
            >
              <Check className="w-6 h-6 mr-2" /> Valider
            </Button>
          </div>
        </div>
      </div>

      {/* Swipe Feedback Overlay */}
      <AnimatePresence>
        {direction === 'right' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-lime/30 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white text-lime p-4 rounded-full shadow-xl rotate-12 border-4 border-lime">
              <Check className="w-16 h-16" strokeWidth={4} />
            </div>
          </motion.div>
        )}
        {direction === 'left' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-destructive/30 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white text-destructive p-4 rounded-full shadow-xl -rotate-12 border-4 border-destructive">
              <X className="w-16 h-16" strokeWidth={4} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


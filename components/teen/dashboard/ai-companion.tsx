'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MessageCircle, Zap, Target, X, ChevronRight, Brain, Send, Loader2, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react'
import { GlowBlob } from '@/components/ui/gen-z-effects'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'

interface AICompanionProps {
  teenName: string
  userId?: string
}

interface Recommendation {
  id: string
  title: string
  type: 'education' | 'crew' | 'entertainment' | 'event' | 'mission'
  xp: number
  color: string
  action?: string
}

const typeIcons = {
  education: Target,
  crew: Zap,
  entertainment: MessageCircle,
  event: Sparkles,
  mission: Target,
}

const typeColors = {
  education: 'var(--gen-z-sky)',
  crew: 'var(--gen-z-coral)',
  entertainment: 'var(--gen-z-lavender)',
  event: 'var(--gen-z-mint)',
  mission: 'var(--gen-z-lime)',
}

export function AICompanion({ teenName, userId }: AICompanionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecos, setLoadingRecos] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Use the AI SDK chat hook
  const { 
    messages, 
    input, 
    setInput, 
    handleSubmit, 
    isLoading, 
    error,
    reload,
    stop
  } = useChat({
    api: '/api/agent/action',
    body: {
      role: 'teen',
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Yo ${teenName} ! 👋 Je suis ton AI Companion. Dis-moi ce que tu veux faire - quêtes, events, ou juste parler !`,
      }
    ],
    onFinish: () => {
      // Scroll to bottom when message finishes
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    },
    onError: (err) => {
      console.error('[AICompanion] Error:', err)
    }
  })

  // Fetch recommendations on open
  const fetchRecommendations = useCallback(async () => {
    if (!userId) return
    
    setLoadingRecos(true)
    try {
      const response = await fetch('/api/teen/recommendations')
      if (response.ok) {
        const data = await response.json()
        const recos = (data.recommendations || []).slice(0, 3).map((r: any, i: number) => ({
          id: r.id || `reco-${i}`,
          title: r.title || r.name || 'Mission disponible',
          type: r.type || 'mission',
          xp: r.xp_reward || r.xp || 50,
          color: typeColors[r.type as keyof typeof typeColors] || typeColors.mission,
          action: r.action,
        }))
        setRecommendations(recos)
      }
    } catch (err) {
      console.error('[AICompanion] Failed to fetch recommendations:', err)
      // Fallback recommendations
      setRecommendations([
        { id: '1', title: "Explorer la map", type: "event", xp: 25, color: typeColors.event },
        { id: '2', title: "Compléter ton profil", type: "mission", xp: 100, color: typeColors.mission },
      ])
    } finally {
      setLoadingRecos(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen && recommendations.length === 0) {
      fetchRecommendations()
    }
  }, [isOpen, recommendations.length, fetchRecommendations])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleQuickAction = (action: string) => {
    setInput(action)
    // Small delay to show the input, then submit
    setTimeout(() => {
      const form = document.getElementById('ai-chat-form') as HTMLFormElement
      if (form) form.requestSubmit()
    }, 100)
  }

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedbackGiven(type)
    // Could send feedback to analytics
    console.log('[AICompanion] Feedback:', type)
  }

  const safeInput = typeof input === "string" ? input : ""

  return (
    <>
      {/* Floating Trigger */}
      <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center justify-center border border-white/20 group overflow-hidden"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </motion.div>
          
          {/* Notification dot if there are recommendations */}
          {recommendations.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gen-z-coral border-2 border-zinc-950 animate-pulse" />
          )}
          
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, x: 100 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.9, x: 100 }}
            className="fixed bottom-32 sm:bottom-28 right-2 sm:right-8 z-[100] w-[calc(100vw-1rem)] sm:w-[400px] max-w-[calc(100vw-1rem)]"
          >
            <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] bg-zinc-950 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] max-h-[60vh] sm:max-h-[70vh] flex flex-col">
              {/* Animated Background */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <GlowBlob color="var(--gen-z-lavender)" size={300} className="-top-20 -right-20 opacity-20" blur={60} />
                <GlowBlob color="var(--gen-z-sky)" size={250} className="-bottom-20 -left-20 opacity-10" blur={60} />
              </div>

              {/* Header */}
              <div className="relative z-10 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gen-z-lavender/20 flex items-center justify-center border border-gen-z-lavender/30">
                      <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-gen-z-lavender" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base sm:text-lg tracking-tight">KAI</h3>
                      <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">AI Companion</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)}
                    className="rounded-full text-zinc-500 hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px] max-h-[300px]"
              >
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3",
                      message.role === 'user' 
                        ? "bg-gen-z-lavender text-black rounded-br-md" 
                        : "bg-white/5 border border-white/10 text-white rounded-bl-md"
                    )}>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gen-z-lavender" />
                        <span className="text-sm text-zinc-400">Kai réfléchit...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error state */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-2 py-4"
                  >
                    <p className="text-sm text-destructive">Oups, une erreur est survenue</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => reload()}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Réessayer
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Feedback buttons (after AI response) */}
              {messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && !feedbackGiven && (
                <div className="relative z-10 px-6 pb-2 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback('positive')}
                    className="h-7 px-2 text-zinc-500 hover:text-success"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback('negative')}
                    className="h-7 px-2 text-zinc-500 hover:text-destructive"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Quick Suggestions */}
              {recommendations.length > 0 && messages.length <= 2 && (
                <div className="relative z-10 px-6 pb-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Suggestions</p>
                  <div className="space-y-2">
                    {recommendations.map((rec) => {
                      const Icon = typeIcons[rec.type] || Target
                      return (
                        <motion.button
                          key={rec.id}
                          whileHover={{ x: 3 }}
                          onClick={() => handleQuickAction(`Parle-moi de: ${rec.title}`)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer group transition-all hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${rec.color}20`, color: rec.color }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <h4 className="text-sm font-bold text-white tracking-tight">{rec.title}</h4>
                              <p className="text-[10px] font-black text-zinc-500 uppercase">+{rec.xp} XP</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form 
                id="ai-chat-form"
                onSubmit={handleSubmit}
                className="relative z-10 p-4 border-t border-white/5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={safeInput}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écris ton message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-gen-z-lavender/50 transition-colors"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !safeInput.trim()}
                    className="h-11 w-11 rounded-xl bg-gen-z-lavender text-black hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AICompanion

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIChat } from './use-ai-chat'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { 
  Sparkles, 
  MessageCircle, 
  Zap, 
  Target, 
  X, 
  ChevronRight, 
  Brain, 
  Send, 
  Loader2, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard
} from 'lucide-react'
import { GlowBlob } from '@/components/ui/gen-z-effects'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

interface EliteAICompanionProps {
  role?: 'teen' | 'parent' | 'ambassador' | 'partner' | 'admin'
  teenName?: string
  userId?: string
  context?: Record<string, unknown>
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

const agentConfig = {
  teen: { name: 'Kai', gradient: 'from-gen-z-lavender to-gen-z-sky', icon: Sparkles },
  parent: { name: 'Aura', gradient: 'from-indigo-500 to-purple-600', icon: Brain },
  partner: { name: 'Biz', gradient: 'from-emerald-500 to-teal-600', icon: Zap },
  ambassador: { name: 'Hype', gradient: 'from-amber-500 to-orange-600', icon: Zap },
  admin: { name: 'Ops', gradient: 'from-slate-600 to-slate-800', icon: Brain },
}

export function EliteAICompanion({ 
  role = 'teen', 
  teenName = 'Champ', 
  userId,
  context 
}: EliteAICompanionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecos, setLoadingRecos] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null)
  const [isTTSActive, setIsTTSActive] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const config = agentConfig[role] || agentConfig.teen
  const Icon = config.icon

  // Mount check for SSR safety
  useEffect(() => { 
    setIsMounted(true) 
  }, [])

  const { messages, input, setInput, handleSubmit, isLoading, error, reload } = useAIChat({
    api: '/api/agent/action',
    body: {
      role,
      context,
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Yo ${teenName} ! 👋 Je suis ${config.name}, ton AI Companion. Dis-moi ce que tu veux faire - quêtes, events, ou juste parler !`,
      },
    ],
    onFinish: (message) => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
      if (isTTSActive && message.role === 'assistant') {
        speak(message.content)
      }
      if (message.toolInvocations?.some((t: { state?: string }) => t.state === 'result')) {
        triggerConfetti()
      }
    },
    onError: (err) => {
      console.error('[EliteAICompanion] Error:', err)
    },
  })

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition()

  // Sync transcript to input when listening
  useEffect(() => {
    if (listening && transcript) {
      setInput(transcript)
    }
  }, [transcript, listening, setInput])

  // Toggle voice listening
  const toggleListening = () => {
    if (!SpeechRecognition) return
    
    if (listening) {
      SpeechRecognition.stopListening()
      setIsListening(false)
    } else {
      resetTranscript()
      setInput('')
      SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' })
      setIsListening(true)
    }
  }

  // Text-to-Speech
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    
    if (role === 'teen') {
      utterance.rate = 1.1 
      utterance.pitch = 1.1
    }
    
    window.speechSynthesis.speak(utterance)
  }

  // Confetti effect
  const triggerConfetti = () => {
    if (typeof window === 'undefined') return
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#f43f5e', '#10b981'],
      zIndex: 9999
    })
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

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
      console.error('[EliteAICompanion] Failed to fetch recommendations:', err)
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
    setTimeout(() => {
      const form = document.getElementById('elite-ai-chat-form') as HTMLFormElement
      if (form) form.requestSubmit()
    }, 100)
  }

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedbackGiven(type)
    console.log('[EliteAICompanion] Feedback:', type)
  }

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isMounted) return null

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className={cn(
            "relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br shadow-[0_0_30px_rgba(139,92,246,0.5)]",
            "flex items-center justify-center border border-white/20 group overflow-hidden",
            config.gradient
          )}
          aria-label={`Ouvrir ${config.name} AI`}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </motion.div>
          
          {/* Notification dot */}
          {recommendations.length > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-gen-z-coral border-2 border-zinc-950 animate-pulse" />
          )}
          
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
        
        {/* Keyboard hint */}
        <div className="hidden sm:flex absolute -top-8 left-1/2 -translate-x-1/2 items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <kbd className="text-[10px] font-mono text-zinc-400">⌘K</kbd>
        </div>
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] sm:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className={cn(
                "fixed z-[100]",
                // Mobile: bottom sheet
                "inset-x-0 bottom-0 sm:inset-auto",
                // Desktop: floating panel
                "sm:bottom-28 sm:right-8 sm:w-[420px] sm:max-w-[calc(100vw-4rem)]"
              )}
            >
              <div className={cn(
                "relative overflow-hidden bg-zinc-950 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col",
                // Mobile: rounded top
                "rounded-t-[2rem] max-h-[85vh]",
                // Desktop: fully rounded
                "sm:rounded-[2.5rem] sm:max-h-[70vh]"
              )}>
                {/* Animated Background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <GlowBlob color="var(--gen-z-lavender)" size={300} className="-top-20 -right-20 opacity-20" blur={60} />
                  <GlowBlob color="var(--gen-z-sky)" size={250} className="-bottom-20 -left-20 opacity-10" blur={60} />
                </div>

                {/* Drag indicator (mobile) */}
                <div className="sm:hidden flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Header */}
                <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/10",
                        "bg-gradient-to-br", config.gradient
                      )}>
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg sm:text-xl tracking-tight">{config.name}</h3>
                        <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">AI Companion</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* TTS Toggle */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsTTSActive(!isTTSActive)}
                        className="rounded-full text-zinc-500 hover:text-white w-9 h-9"
                      >
                        {isTTSActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                      
                      {/* Close */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsOpen(false)}
                        className="rounded-full text-zinc-500 hover:text-white w-9 h-9"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div 
                  ref={chatContainerRef}
                  className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-[200px] max-h-[300px]"
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {messages.map((message: any) => (
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
                        
                        {/* Generative UI Widgets */}
                        {message.toolInvocations?.map((tool: any) => (
                          <div key={tool.toolCallId} className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            {tool.state === 'result' ? (
                              <div className="flex items-center gap-2 text-xs text-gen-z-mint">
                                <span className="w-2 h-2 rounded-full bg-gen-z-mint animate-pulse" />
                                {tool.result?.message || "Action effectuée !"}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-gen-z-lavender">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {config.name} travaille sur: {tool.toolName}...
                              </div>
                            )}
                          </div>
                        ))}
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
                          <span className="text-sm text-zinc-400">{config.name} réfléchit...</span>
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
                        onClick={() => reload?.()}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Réessayer
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* Feedback buttons */}
                {messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && !feedbackGiven && (
                  <div className="relative z-10 px-4 sm:px-6 pb-2 flex justify-end gap-2">
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
                  <div className="relative z-10 px-4 sm:px-6 pb-4 space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Suggestions</p>
                    <div className="space-y-2">
                      {recommendations.map((rec) => {
                        const RecIcon = typeIcons[rec.type] || Target
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
                                <RecIcon className="w-4 h-4" />
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
                  id="elite-ai-chat-form"
                  onSubmit={handleSubmit}
                  className="relative z-10 p-4 border-t border-white/5 bg-zinc-950/50 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    {/* Voice input toggle */}
                    {browserSupportsSpeechRecognition && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleListening}
                        className={cn(
                          "rounded-xl h-11 w-11 flex-shrink-0",
                          listening 
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" 
                            : "text-zinc-500 hover:text-white"
                        )}
                      >
                        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </Button>
                    )}
                    
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={listening ? "Je t'écoute..." : "Écris ton message..."}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-gen-z-lavender/50 transition-colors"
                      disabled={isLoading}
                    />
                    
                    <Button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className={cn(
                        "h-11 w-11 rounded-xl text-white hover:scale-105 transition-transform disabled:opacity-50",
                        "bg-gradient-to-br", config.gradient
                      )}
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
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default EliteAICompanion

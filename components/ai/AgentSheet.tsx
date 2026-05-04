"use client"

import { useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import 'regenerator-runtime/runtime'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { Mic, Send, Sparkles, Shield, TrendingUp, Zap, Terminal, MicOff, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

// WIDGETS IMPORTS
import { FriendMap } from "./widgets/FriendMap"
import { BudgetChart } from "./widgets/BudgetChart"
import { OfferPreview } from "./widgets/OfferPreview"

interface AgentSheetProps {
  role: "teen" | "parent" | "ambassador" | "partner" | "admin"
  children: React.ReactNode
  context?: any
}

export function AgentSheet({ role, children, context }: AgentSheetProps) {
  // Mount check for SSR safety
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // TTS State
  const [isTTSActive, setIsTTSActive] = useState(true) 
  
  // Vercel AI SDK useChat hook
  const chat = useChat({
    api: '/api/agent/action',
    body: { role, context },
    onFinish: (message) => {
      // 1. Text-to-Speech
      if (isTTSActive && message.role === 'assistant') {
        speak(message.content)
      }
    },
    onError: (err) => {
      console.error("Agent Error:", err)
    }
  })
  const messages = chat.messages || []
  const input = typeof chat.input === "string" ? chat.input : ""
  const safeInput = typeof input === "string" ? input : ""
  const setInput = chat.setInput
  const handleSubmit = chat.handleSubmit
  const isLoading = chat.isLoading
  const error = chat.error

  // Trigger Confetti when a tool succeeds
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.toolInvocations) {
      const hasSuccess = lastMessage.toolInvocations.some((t: any) => t.state === 'result');
      if (hasSuccess) {
        triggerConfetti();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      }
    }
  }, [messages]);

  const triggerConfetti = () => {
    if (typeof window === 'undefined') return
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#f43f5e', '#10b981'],
      zIndex: 9999
    });
  }

  // Speech Recognition Hook - Only run on client
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  // Sync transcript to input ONLY when listening
  useEffect(() => {
    if (listening && transcript && setInput) {
      setInput(transcript)
    }
  }, [transcript, listening, setInput])

  // Handle manual stop listening
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening()
    } else {
      resetTranscript()
      if (setInput) setInput("") // Clear input when starting new recording
      SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' })
    }
  }

  // Text-to-Speech Helper
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    
    // Customize Voice based on Role (Best effort)
    const voices = window.speechSynthesis.getVoices()
    
    if (role === 'teen') {
      utterance.rate = 1.1 
      utterance.pitch = 1.1
    } else if (role === 'parent') {
      utterance.rate = 0.95
      utterance.pitch = 0.9
    } else if (role === 'partner') {
      utterance.rate = 1.05
    }

    window.speechSynthesis.speak(utterance)
  }

  // Render nothing or fallback during SSR to prevent hydration mismatch with speech/browser APIs
  if (!isMounted) {
    return <>{children}</> // Render children so the button appears, but sheet might not be interactive yet
  }

  // Agent configuration per role
  const agentConfig = {
    teen: { name: "Kai", color: "text-cyan-600", bg: "bg-cyan-50", icon: Sparkles },
    parent: { name: "Aura", color: "text-indigo-600", bg: "bg-indigo-50", icon: Shield },
    partner: { name: "Biz", color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
    ambassador: { name: "Hype", color: "text-amber-600", bg: "bg-amber-50", icon: Zap },
    admin: { name: "Ops", color: "text-slate-600", bg: "bg-slate-50", icon: Terminal },
  }

  const config = agentConfig[role] || agentConfig.teen
  const Icon = config.icon

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] flex flex-col p-0">
        <SheetHeader className={cn("p-4 border-b flex flex-row items-center justify-between gap-3", config.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full bg-white shadow-sm", config.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <SheetTitle className={cn("text-lg", config.color)}>
              {config.name} AI
            </SheetTitle>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setIsTTSActive(!isTTSActive)}>
            {isTTSActive ? <Volume2 className="w-4 h-4 opacity-50" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </Button>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-10">
                  <p>Bonjour ! Je suis {config.name}.</p>
                  <p className="text-sm">Appuyez sur le micro pour parler.</p>
                </div>
              )}
              
              {messages.map((msg: any, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg max-w-[90%] text-sm mb-4",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-muted mr-auto"
                  )}
                >
                  <div className="mb-2">{msg.content}</div>

                  {/* GENERATIVE UI: Render Widgets based on Tools */}
                  {msg.toolInvocations?.map((toolInvocation: any) => {
                    const { toolName, toolCallId, state, args, result } = toolInvocation;
                    
                    if (state === 'result') {
                       return (
                        <div key={toolCallId} className="mt-2 animate-in fade-in zoom-in duration-300">
                          
                          {/* TEEN WIDGETS */}
                          {toolName === 'performCheckIn' && (
                            <FriendMap 
                              venueName={args.venueName} 
                              friends={[
                                { id: '1', name: 'Yasmine', lat: 0, lng: 0 },
                                { id: '2', name: 'Ahmed', lat: 0, lng: 0 }
                              ]} 
                            />
                          )}

                          {/* PARENT WIDGETS */}
                          {toolName === 'updateBudgetLimit' && (
                            <BudgetChart 
                              category={args.category}
                              current={args.amount * 0.8} // Mock visual data
                              limit={args.amount}
                              history={[100, 120, 90, 80, 150]}
                            />
                          )}

                          {/* PARTNER WIDGETS */}
                          {toolName === 'createFlashOffer' && (
                            <OfferPreview 
                              title={args.title}
                              discount={args.discount}
                              expiresIn="24h"
                            />
                          )}

                          {/* GENERIC FEEDBACK */}
                          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {result?.message || "Action effectuée"}
                          </div>
                        </div>
                       )
                    } 
                    return (
                        <div key={toolCallId} className="mt-2 p-2 bg-yellow-50 text-yellow-700 rounded text-xs border border-yellow-200">
                          ⏳ {config.name} travaille sur : {toolName}...
                        </div>
                    )
                  })}
                </div>
              ))}
              
              {isLoading && (
                <div className="mr-auto text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-500 rounded-lg text-sm">
                  Oups, une erreur est survenue: {error.message}
                  <br/>
                  <span className="text-xs text-red-400">Vérifiez que la clé API est configurée.</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(listening && "bg-red-50 text-red-500 border-red-200 animate-pulse")}
                onClick={toggleListening}
                disabled={!isMounted || !browserSupportsSpeechRecognition}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                placeholder={listening ? "Je vous écoute..." : "Écrivez votre message..."}
                value={safeInput}
                onChange={e => setInput?.(e.target.value)}
              />
              <Button type="submit" size="icon" disabled={!safeInput.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

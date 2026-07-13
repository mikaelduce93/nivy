"use client"

/**
 * #Voice — Reconnaissance vocale (STT) native via Web Speech API.
 *
 * Aucune lib externe (remplace react-speech-recognition supprimé avec le
 * legacy Kai). Utilise SpeechRecognition / webkitSpeechRecognition directement.
 *
 * Limitations assumées (documentées) :
 *  - Non supporté sur Firefox → le hook expose `supported=false`, l'UI cache
 *    le bouton micro (pas de fallback dans ce plan — cf. plan Whisper séparé).
 *  - Requiert HTTPS (ou localhost) pour l'accès micro.
 *  - Reconnaissance continue : le transcript s'accumule tant que `listening`.
 */

import * as React from "react"

// Types minimaux pour l'API (le DOM lib TS ne les expose pas encore partout).
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string
  message: string
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const STT_LANG = "fr-FR"

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export interface UseSpeechToTextResult {
  /** vrai si le navigateur supporte la Web Speech API (cache le bouton sinon). */
  supported: boolean
  /** vrai pendant l'enregistrement actif. */
  listening: boolean
  /** Texte transcrit cumulé (interim + final). Remis à 0 sur `reset`. */
  transcript: string
  /** Démarre l'écoute. No-op si unsupported ou déjà en écoute. */
  start: () => void
  /** Arrête l'écoute (garde le transcript). */
  stop: () => void
  /** Vide le transcript. */
  reset: () => void
}

/**
 * Hook de dictée vocale continue en français. Le transcript est mis à jour
 * live (résultats interim compris) — le caller le branche typiquement dans un
 * champ texte via useEffect.
 *
 * Cleanup : la reconnaissance est abortée au démount pour ne pas laisser un
 * micro ouvert.
 */
export function useSpeechToText(): UseSpeechToTextResult {
  const ctorRef = React.useRef<SpeechRecognitionCtor | null>(null)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const [listening, setListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState("")
  const [supported] = React.useState<boolean>(() => getRecognitionCtor() !== null)

  // Initialise la factory une fois.
  if (!ctorRef.current) ctorRef.current = getRecognitionCtor()

  const stop = React.useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {
        // Déjà stoppée — ignore.
      }
    }
    setListening(false)
  }, [])

  const reset = React.useCallback(() => {
    setTranscript("")
  }, [])

  const start = React.useCallback(() => {
    const Ctor = ctorRef.current
    if (!Ctor || listening) return
    // Nettoie une éventuelle instance précédente.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    const rec = new Ctor()
    rec.lang = STT_LANG
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    // Accumule le texte finalisé ; les interim remplacent temporairement la fin.
    let finalText = ""
    rec.onstart = () => setListening(true)

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alt = result[0]
        if (!alt) continue
        if (result.isFinal) {
          finalText += (finalText && !finalText.endsWith(" ") ? " " : "") + alt.transcript
        } else {
          interim += alt.transcript
        }
      }
      const combined = (finalText + (interim ? (finalText && !finalText.endsWith(" ") ? " " : "") + interim : "")).trim()
      setTranscript(combined || " ")
    }

    rec.onerror = (e: SpeechRecognitionErrorEventLike) => {
      // 'no-speech' / 'aborted' sont normaux — on ne log que les vraies erreurs.
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("[stt] recognition error:", e.error)
      }
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {
      // start() peut lever si appelé 2x rapidement — on ignore proprement.
      console.warn("[stt] start() failed:", err)
      setListening(false)
    }
  }, [listening])

  // Cleanup au unmount : on coupe le micro pour éviter une fuite.
  React.useEffect(() => {
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        try {
          rec.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [])

  return { supported, listening, transcript, start, stop, reset }
}

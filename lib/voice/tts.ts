/**
 * #Voice — Synthèse vocale (TTS) native via window.speechSynthesis.
 *
 * Aucune lib externe : on utilise l'API Web Speech du navigateur. Corrige les
 * bugs du prototype Kai (getVoices() appelé mais jamais assigné, pas de
 * gestion voiceschanged, pas de onend/onerror).
 *
 * SSR-safe : toutes les fonctions gardent `typeof window === 'undefined'`.
 * Pas de state global mutable hors des fonctions (le synthèse est une API
 * singleton côté navigateur).
 */

// Langue cible : français standard. On tente fr-FR puis toute voix FR.
const TTS_LANG = "fr-FR"
// Prosodie légèrement plus aiguë/rapide pour un public ado (13-17).
const TTS_RATE = 1.05
const TTS_PITCH = 1.05

/** vrai uniquement côté navigateur avec l'API dispo. */
export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

let cachedVoices: SpeechSynthesisVoice[] | null = null
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

/**
 * Charge les voix de façon fiable. Chrome peuple getVoices() de façon async
 * (vide au 1er appel) → on écoute l'évt 'voiceschanged'. Safari les a tout
 * de suite. On cache pour ne pas réécouter.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices && cachedVoices.length) return Promise.resolve(cachedVoices)
  if (!isTTSSupported()) return Promise.resolve([])
  if (voicesPromise) return voicesPromise

  const synth = window.speechSynthesis
  voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const initial = synth.getVoices()
    if (initial.length) {
      cachedVoices = initial
      resolve(initial)
      return
    }
    // Chrome : voix pas encore prêtes → on attend l'évt.
    const handler = () => {
      const v = synth.getVoices()
      cachedVoices = v
      synth.removeEventListener("voiceschanged", handler)
      resolve(v)
    }
    synth.addEventListener("voiceschanged", handler)
    // Filet : si l'évt ne vient jamais (edge cases), on résout après 500ms.
    setTimeout(() => {
      if (!cachedVoices) {
        cachedVoices = synth.getVoices()
        synth.removeEventListener("voiceschanged", handler)
        resolve(cachedVoices)
      }
    }, 500)
  })
  return voicesPromise
}

/** Choisit la meilleure voix FR dispo (préfère fr-FR exact, sinon任何 fr-*). */
function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  return (
    voices.find((v) => v.lang?.toLowerCase() === TTS_LANG.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("fr")) ||
    null
  )
}

export interface SpeakOptions {
  /** Callback quand la parole se termine naturellement. */
  onEnd?: () => void
  /** Callback en cas d'erreur (permet au caller de retomber sur silencieux). */
  onError?: () => void
}

/**
 * Parle un texte en français. Interrompt toute énonciation en cours (comportement
 * attendu pour un chat : la nouvelle réponse remplace la précédente).
 *
 * Best-effort : si l'API échoue silencieusement, on appelle `onEnd` quand même
 * pour ne pas bloquer l'UI caller (ex: spinner qui ne se termine jamais).
 */
export async function speakNiv(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!isTTSSupported()) {
    opts.onEnd?.()
    return
  }
  const clean = (text || "").trim()
  if (!clean) {
    opts.onEnd?.()
    return
  }

  const synth = window.speechSynthesis
  // Annule l'énoncé en cours : la nouvelle réponse remplace l'ancienne.
  synth.cancel()

  const voices = await loadVoices()
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = TTS_LANG
  utterance.rate = TTS_RATE
  utterance.pitch = TTS_PITCH
  utterance.volume = 1
  const voice = pickFrenchVoice(voices)
  if (voice) utterance.voice = voice

  utterance.onend = () => opts.onEnd?.()
  utterance.onerror = () => opts.onError?.()

  synth.speak(utterance)
}

/** Coupe immédiatement toute parole en cours. Idempotent. */
export function stopSpeaking(): void {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
}

/** vrai si une énonciation est en cours (pour afficher un état "en train de parler"). */
export function isSpeaking(): boolean {
  return isTTSSupported() && window.speechSynthesis.speaking
}

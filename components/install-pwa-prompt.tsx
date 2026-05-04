"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem("pwa-prompt-dismissed")
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("[v0] User accepted the PWA install prompt")
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-prompt-dismissed", "true")
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Installer l'application</h3>
        <p className="text-sm text-zinc-400">
          Installez Teens Party sur votre appareil pour un accès rapide et une meilleure expérience.
        </p>
      </div>

      <Button onClick={handleInstall} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0">
        <Download className="w-4 h-4 mr-2" />
        Installer maintenant
      </Button>
    </div>
  )
}

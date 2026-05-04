"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  X,
  Smartphone,
  Share,
  Plus,
  Check,
  ArrowRight,
  Zap,
  Bell,
  WifiOff,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

/* ==========================================================================
   HOOK: usePWAInstall
   ========================================================================== */

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Détecter iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Vérifier si déjà installé (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                         (navigator as any).standalone === true

    setIsInstalled(isStandalone)

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Écouter l'installation réussie
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)

      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "pwa_install_success")
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === "accepted") {
        setIsInstalled(true)
        setIsInstallable(false)
      }

      setDeferredPrompt(null)
      return choice.outcome === "accepted"
    } catch (error) {
      console.error("Erreur installation PWA:", error)
      return false
    }
  }, [deferredPrompt])

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  }
}

/* ==========================================================================
   PWA INSTALL BANNER - Bannière en bas de page
   ========================================================================== */

interface PWAInstallBannerProps {
  className?: string
  onDismiss?: () => void
}

export function PWAInstallBanner({ className, onDismiss }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  // Vérifier si déjà dismissed (localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-banner-dismissed")
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      // Re-afficher après 7 jours
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString())
    onDismiss?.()
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
    } else {
      const success = await promptInstall()
      if (success) {
        handleDismiss()
      }
    }
  }

  // Ne pas afficher si installé, dismissed, ou non-installable (sauf iOS)
  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe",
            className
          )}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="max-w-lg mx-auto bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-4 shadow-xl border border-zinc-700">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold mb-1">
                  Installe l'app Teens Party
                </h3>
                <p className="text-zinc-400 text-sm mb-3">
                  Accès rapide, notifications et mode hors ligne !
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-white text-sm flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                  >
                    <Download className="w-4 h-4" />
                    Installer
                  </motion.button>

                  <motion.button
                    className="py-2.5 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-zinc-300 text-sm transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDismiss}
                  >
                    Plus tard
                  </motion.button>
                </div>
              </div>

              {/* Close button */}
              <button
                className="text-zinc-500 hover:text-white transition-colors"
                onClick={handleDismiss}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <IOSInstallInstructions onClose={() => setShowIOSInstructions(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ==========================================================================
   IOS INSTALL INSTRUCTIONS - Modal pour iOS
   ========================================================================== */

interface IOSInstallInstructionsProps {
  onClose: () => void
}

function IOSInstallInstructions({ onClose }: IOSInstallInstructionsProps) {
  const steps = [
    {
      icon: Share,
      title: "Appuie sur Partager",
      description: "En bas de Safari, appuie sur l'icône de partage",
    },
    {
      icon: Plus,
      title: "Sur l'écran d'accueil",
      description: "Fais défiler et choisis \"Sur l'écran d'accueil\"",
    },
    {
      icon: Check,
      title: "Ajouter",
      description: "Appuie sur Ajouter en haut à droite",
    },
  ]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 text-center">
          <button
            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Installer sur iPhone
          </h2>
          <p className="text-zinc-400 text-sm">
            Ajoute Teens Party à ton écran d'accueil en 3 étapes
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-6 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon

            return (
              <motion.div
                key={index}
                className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{index + 1}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-medium">{step.title}</span>
                  </div>
                  <p className="text-zinc-400 text-sm">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <motion.button
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-white"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
          >
            J'ai compris
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   PWA INSTALL BUTTON - Bouton simple
   ========================================================================== */

interface PWAInstallButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
}

export function PWAInstallButton({
  className,
  variant = "default",
  size = "md",
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  if (isInstalled) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-green-400",
        size === "sm" && "text-sm",
        className
      )}>
        <Check className="w-4 h-4" />
        <span>Installé</span>
      </div>
    )
  }

  if (!isInstallable && !isIOS) {
    return null
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
    } else {
      await promptInstall()
    }
  }

  const sizeClasses = {
    sm: "py-1.5 px-3 text-sm",
    md: "py-2 px-4",
    lg: "py-3 px-6 text-lg",
  }

  const variantClasses = {
    default: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
    outline: "border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10",
    ghost: "text-cyan-400 hover:bg-cyan-500/10",
  }

  return (
    <>
      <motion.button
        className={cn(
          "rounded-xl font-medium flex items-center gap-2",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
      >
        <Download className="w-4 h-4" />
        Installer l'app
      </motion.button>

      <AnimatePresence>
        {showIOSModal && (
          <IOSInstallInstructions onClose={() => setShowIOSModal(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ==========================================================================
   PWA FEATURES CARD - Carte promotionnelle
   ========================================================================== */

interface PWAFeaturesCardProps {
  className?: string
}

export function PWAFeaturesCard({ className }: PWAFeaturesCardProps) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  const features = [
    {
      icon: Zap,
      title: "Ultra rapide",
      description: "Lancement instantané",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Ne rate rien",
    },
    {
      icon: WifiOff,
      title: "Mode hors ligne",
      description: "Même sans internet",
    },
  ]

  if (isInstalled) return null

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true)
    } else {
      await promptInstall()
    }
  }

  return (
    <>
      <motion.div
        className={cn(
          "bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 border border-zinc-700",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Installe l'app</h3>
            <p className="text-zinc-400 text-sm">Meilleure expérience</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {features.map((feature, index) => {
            const Icon = feature.icon

            return (
              <div
                key={index}
                className="text-center p-3 bg-zinc-800/50 rounded-xl"
              >
                <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-white text-xs font-medium">{feature.title}</p>
                <p className="text-zinc-500 text-xs">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Install button */}
        {(isInstallable || isIOS) && (
          <motion.button
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-white flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleInstall}
          >
            <Download className="w-4 h-4" />
            Installer maintenant
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {showIOSModal && (
          <IOSInstallInstructions onClose={() => setShowIOSModal(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

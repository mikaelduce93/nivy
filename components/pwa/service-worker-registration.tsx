"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, X, Download, CheckCircle } from "lucide-react"

/* ==========================================================================
   HOOK: useSWUpdate - Gère les mises à jour du Service Worker
   ========================================================================== */

export function useSWUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowUpdatePrompt(true)
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing

        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setShowUpdatePrompt(true)
            }
          })
        }
      })
    }

    // Écouter les messages du SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        console.log("[PWA] Service Worker updated to version:", event.data.payload?.version)
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)

    // Vérifier le SW existant
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        handleSWUpdate(registration)
      }
    })

    // Écouter les changements de contrôleur
    let refreshing = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [])

  const updateServiceWorker = useCallback(() => {
    if (waitingWorker) {
      setIsUpdating(true)
      waitingWorker.postMessage({ type: "SKIP_WAITING" })
    }
  }, [waitingWorker])

  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false)
  }, [])

  return {
    showUpdatePrompt,
    isUpdating,
    updateServiceWorker,
    dismissUpdate,
  }
}

/* ==========================================================================
   SERVICE WORKER REGISTRATION - Composant de registration
   ========================================================================== */

interface ServiceWorkerRegistrationProps {
  children?: React.ReactNode
}

export function ServiceWorkerRegistration({ children }: ServiceWorkerRegistrationProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const { showUpdatePrompt, isUpdating, updateServiceWorker, dismissUpdate } = useSWUpdate()

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })

        setIsRegistered(true)
        console.log("[PWA] Service Worker registered:", registration.scope)

        // Vérifier les mises à jour périodiquement
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Toutes les heures

        // Demander la permission pour les notifications
        if ("Notification" in window && Notification.permission === "default") {
          // Attendre un peu avant de demander
          setTimeout(() => {
            Notification.requestPermission()
          }, 30000) // 30 secondes après le chargement
        }

        // Enregistrer pour le periodic background sync si supporté
        if (registration.periodicSync) {
          try {
            await registration.periodicSync.register("update-content", {
              minInterval: 24 * 60 * 60 * 1000, // 24 heures
            })
            console.log("[PWA] Periodic sync registered")
          } catch (error) {
            console.log("[PWA] Periodic sync not available")
          }
        }

      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error)
      }
    }

    // Attendre que la page soit chargée
    if (document.readyState === "complete") {
      registerSW()
    } else {
      window.addEventListener("load", registerSW)
      return () => window.removeEventListener("load", registerSW)
    }
  }, [])

  return (
    <>
      {children}

      {/* Update Prompt */}
      <AnimatePresence>
        {showUpdatePrompt && (
          <SWUpdatePrompt
            isUpdating={isUpdating}
            onUpdate={updateServiceWorker}
            onDismiss={dismissUpdate}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ==========================================================================
   SW UPDATE PROMPT - Notification de mise à jour
   ========================================================================== */

interface SWUpdatePromptProps {
  isUpdating: boolean
  onUpdate: () => void
  onDismiss: () => void
}

function SWUpdatePrompt({ isUpdating, onUpdate, onDismiss }: SWUpdatePromptProps) {
  return (
    <motion.div
      className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-purple-500/20">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            {isUpdating ? (
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Download className="w-6 h-6 text-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold mb-1">
              {isUpdating ? "Mise à jour..." : "Nouvelle version disponible"}
            </h3>
            <p className="text-purple-200 text-sm mb-3">
              {isUpdating
                ? "Installation en cours, ne ferme pas l'app"
                : "Une mise à jour est prête à être installée"
              }
            </p>

            {/* Actions */}
            {!isUpdating && (
              <div className="flex gap-2">
                <motion.button
                  className="flex-1 py-2 px-4 bg-white text-purple-900 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onUpdate}
                >
                  <RefreshCw className="w-4 h-4" />
                  Mettre à jour
                </motion.button>

                <motion.button
                  className="py-2 px-4 bg-purple-800 hover:bg-purple-700 rounded-xl text-white text-sm transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onDismiss}
                >
                  Plus tard
                </motion.button>
              </div>
            )}
          </div>

          {/* Close */}
          {!isUpdating && (
            <button
              className="text-purple-300 hover:text-white transition-colors"
              onClick={onDismiss}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   PWA INSTALL SUCCESS - Toast après installation
   ========================================================================== */

export function PWAInstallSuccess({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="bg-gradient-to-r from-green-900/90 to-emerald-900/90 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-green-500/20">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle className="w-6 h-6 text-white" />
          </motion.div>

          <div className="flex-1">
            <h3 className="text-white font-bold">App installée !</h3>
            <p className="text-green-200 text-sm">
              Tu peux maintenant lancer Teens Party depuis ton écran d'accueil
            </p>
          </div>

          <button
            className="text-green-300 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

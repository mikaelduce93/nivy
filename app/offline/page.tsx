"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { WifiOff, RefreshCw, Home, Calendar, Users, Smartphone } from "lucide-react"
import Link from "next/link"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cachedPages, setCachedPages] = useState<string[]>([])

  useEffect(() => {
    // Vérifier le status online
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Rediriger vers la page d'accueil après un délai
      setTimeout(() => {
        window.location.href = "/"
      }, 1500)
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Récupérer les pages cachées
    loadCachedPages()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  async function loadCachedPages() {
    try {
      const cacheNames = await caches.keys()
      const pagesCache = cacheNames.find((name) => name.includes("pages"))

      if (pagesCache) {
        const cache = await caches.open(pagesCache)
        const keys = await cache.keys()
        const urls = keys
          .map((request) => new URL(request.url).pathname)
          .filter((path) => path !== "/offline")
        setCachedPages(urls)
      }
    } catch (error) {
      console.error("Erreur lecture cache:", error)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // Suggestions de pages disponibles hors ligne
  const offlineFeatures = [
    {
      icon: Calendar,
      title: "Événements sauvegardés",
      description: "Consulte les événements que tu as déjà visités",
      path: "/agenda",
    },
    {
      icon: Users,
      title: "Clubs favoris",
      description: "Tes clubs préférés sont disponibles hors ligne",
      path: "/clubs",
    },
    {
      icon: Home,
      title: "Page d'accueil",
      description: "Retourne à l'accueil en mode cache",
      path: "/",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Animation de reconnexion */}
        {isOnline && (
          <motion.div
            className="fixed inset-0 bg-green-500/20 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-zinc-900 rounded-2xl p-8 text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <WifiOff className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Connexion rétablie !</h2>
              <p className="text-zinc-400">Redirection en cours...</p>
            </motion.div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Icône animée */}
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(6, 182, 212, 0)",
                "0 0 0 20px rgba(6, 182, 212, 0.1)",
                "0 0 0 0 rgba(6, 182, 212, 0)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            >
              <WifiOff className="w-12 h-12 text-zinc-500" />
            </motion.div>
          </motion.div>

          <h1 className="text-3xl font-black text-white mb-3">
            Tu es hors ligne
          </h1>
          <p className="text-zinc-400 text-lg">
            Pas de panique ! Certaines fonctionnalités restent disponibles.
          </p>
        </motion.div>

        {/* Status indicator */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-sm text-zinc-500">
            {isOnline ? "En ligne" : "Hors ligne"}
          </span>
        </motion.div>

        {/* Actions principales */}
        <motion.div
          className="space-y-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Bouton Réessayer */}
          <motion.button
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl font-bold text-white flex items-center justify-center gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Actualisation..." : "Réessayer la connexion"}
          </motion.button>

          {/* Retour accueil */}
          <Link href="/">
            <motion.button
              className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-medium text-white flex items-center justify-center gap-3 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil (cache)
            </motion.button>
          </Link>
        </motion.div>

        {/* Pages disponibles hors ligne */}
        {cachedPages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Disponible hors ligne
            </h3>
            <div className="space-y-2">
              {offlineFeatures.map((feature, index) => {
                const Icon = feature.icon
                const isAvailable = cachedPages.includes(feature.path)

                return (
                  <motion.div
                    key={feature.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    {isAvailable ? (
                      <Link href={feature.path}>
                        <div className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl flex items-center gap-4 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{feature.title}</p>
                            <p className="text-zinc-500 text-sm">{feature.description}</p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-4 bg-zinc-900/50 rounded-xl flex items-center gap-4 opacity-50">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-zinc-500 font-medium">{feature.title}</p>
                          <p className="text-zinc-600 text-sm">Non disponible hors ligne</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Conseil installation PWA */}
        <motion.div
          className="mt-8 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium mb-1">Installe l'app</p>
              <p className="text-zinc-400 text-sm">
                Ajoute Teens Party à ton écran d'accueil pour une meilleure expérience hors ligne !
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-zinc-600 text-sm mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Teens Party Morocco v2.0
        </motion.p>
      </div>
    </div>
  )
}

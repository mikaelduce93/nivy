'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TeenDashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Teen Dashboard Error]:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[100px]" />
        <div className="absolute bottom-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-accent-soft/5 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </motion.div>

        {/* Error message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">
            Oups, quelque chose s'est mal passé
          </h1>
          <p className="text-zinc-400 mb-2">
            Une erreur inattendue s'est produite. Pas de panique, on va résoudre ça !
          </p>
          <p className="text-xs text-zinc-600 mb-8">
            {error.digest && `Code erreur: ${error.digest}`}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={reset}
            className="bg-brand-soft hover:bg-brand-soft/80 text-white font-bold rounded-2xl px-6 py-3 h-auto"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Réessayer
          </Button>
          
          <Link href="/teen">
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 font-bold rounded-2xl px-6 py-3 h-auto w-full sm:w-auto"
            >
              <Home className="w-5 h-5 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </motion.div>

        {/* Error details (collapsed) - dev only, never expose stack traces in production UI */}
        {process.env.NODE_ENV === 'development' && (
          <motion.details
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-left"
          >
            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Détails techniques (dev only)
            </summary>
            <pre className="mt-2 p-4 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-red-400 overflow-auto max-h-40">
              {error.message}
            </pre>
            <p className="mt-2 text-[10px] text-zinc-600">
              La trace complète est uniquement disponible dans la console serveur.
            </p>
          </motion.details>
        )}

        {/* Decorative elements */}
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-red-500/5 to-accent-soft/5 blur-[100px]" />
      </motion.div>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface OnboardingCompleteClientProps {
  redirectTo: string
  /** Auto-redirect delay in ms. */
  autoRedirectMs?: number
}

export function OnboardingCompleteClient({
  redirectTo,
  autoRedirectMs = 2500,
}: OnboardingCompleteClientProps) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      router.push(redirectTo)
    }, autoRedirectMs)
    return () => clearTimeout(t)
  }, [router, redirectTo, autoRedirectMs])

  return (
    <Card className="p-8 sm:p-10 max-w-lg w-full text-center space-y-5">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="mx-auto w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center"
      >
        <Sparkles className="w-8 h-8" />
      </motion.div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Tu es prêt(e) !
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Ton profil est personnalisé. On t'envoie sur ton dashboard…
        </p>
      </div>
      <Button onClick={() => router.push(redirectTo)} size="lg" className="w-full sm:w-auto">
        Aller à mon espace
      </Button>
    </Card>
  )
}

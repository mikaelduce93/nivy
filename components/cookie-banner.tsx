"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem("cookies-accepted")
    if (!hasAccepted) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem("cookies-accepted", "true")
    setShowBanner(false)
  }

  const declineCookies = () => {
    localStorage.setItem("cookies-accepted", "false")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom">
      <Card className="max-w-4xl mx-auto p-6 bg-background/95 backdrop-blur-lg border-2">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">🍪 Nous utilisons des cookies</h3>
            <p className="text-sm text-muted-foreground">
              Nous utilisons des cookies essentiels pour assurer le bon fonctionnement de notre site et des cookies
              analytiques pour améliorer votre expérience. En continuant, vous acceptez notre utilisation des cookies.{" "}
              <Link href="/legal/confidentialite" className="text-primary hover:underline">
                En savoir plus
              </Link>
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={declineCookies} className="flex-1 md:flex-none bg-transparent">
              Refuser
            </Button>
            <Button
              onClick={acceptCookies}
              className="flex-1 md:flex-none bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Accepter
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

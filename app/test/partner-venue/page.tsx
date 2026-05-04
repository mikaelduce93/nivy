"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LogIn, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function PartnerVenueTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [isPartner, setIsPartner] = useState(false)
  const supabase = createClient()

  const PARTNER_EMAIL = "venue.partner@teenclub.ma"
  const PARTNER_PASSWORD = "Test123!"

  useEffect(() => {
    checkAuthStatus()
    
    // Vérifier s'il y a une erreur dans l'URL
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam) {
      toast.error(`Erreur: ${decodeURIComponent(errorParam)}`)
    }
  }, [])

  async function checkAuthStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserEmail(user.email || "")
        setIsLoggedIn(true)
        
        // Check if user is a partner
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        if (profile?.role === "partner") {
          setIsPartner(true)
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error)
    } finally {
      setChecking(false)
    }
  }

  async function handleLogin() {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: PARTNER_EMAIL,
        password: PARTNER_PASSWORD,
      })

      if (error) {
        toast.error(`Erreur de connexion: ${error.message}`)
        return
      }

      if (data.user) {
        toast.success("Connexion réussie !")
        setIsLoggedIn(true)
        setUserEmail(PARTNER_EMAIL)
        setIsPartner(true)
        
        // Redirect to partner dashboard
        setTimeout(() => {
          router.push("/partner")
        }, 1000)
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setIsLoggedIn(false)
      setUserEmail("")
      setIsPartner(false)
      toast.success("Déconnexion réussie")
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    router.push("/partner")
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-zinc-400">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  🍽️ Dashboard Partenaire Venue - Test
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Accès rapide au dashboard partenaire venue
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push("/test/partner-venue/auto-login")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Accès direct
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                {isLoggedIn ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Statut: {isLoggedIn ? "Connecté" : "Non connecté"}
                  </p>
                  {isLoggedIn && (
                    <p className="text-xs text-zinc-400 mt-1">{userEmail}</p>
                  )}
                </div>
              </div>

              {isLoggedIn && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                  {isPartner ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Rôle: {isPartner ? "Partenaire" : "Non partenaire"}
                    </p>
                    {!isPartner && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Ce compte n'est pas un partenaire
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Credentials Info */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-sm font-medium text-emerald-400 mb-2">
                Compte de test partenaire venue:
              </p>
              <div className="space-y-1 text-xs text-zinc-400">
                <p><strong className="text-white">Email:</strong> {PARTNER_EMAIL}</p>
                <p><strong className="text-white">Mot de passe:</strong> {PARTNER_PASSWORD}</p>
                <p><strong className="text-white">Entreprise:</strong> Le Rooftop Teen</p>
                <p><strong className="text-white">Type:</strong> Venue</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!isLoggedIn ? (
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Se connecter au compte partenaire venue
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {isPartner ? (
                    <Button
                      onClick={goToDashboard}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="lg"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Accéder au dashboard partenaire
                    </Button>
                  ) : (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-sm text-amber-400">
                        ⚠️ Vous êtes connecté mais ce compte n'est pas un partenaire.
                        Veuillez vous connecter avec le compte partenaire venue.
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handleLogout}
                    disabled={loading}
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Se déconnecter
                  </Button>
                </>
              )}
            </div>

            {/* Diagnostic */}
            <div className="pt-4 border-t border-zinc-800">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/test/check-partner-venue")
                    const data = await response.json()
                    console.log("Diagnostic:", data)
                    alert(`Diagnostic:\n\n${JSON.stringify(data, null, 2)}\n\nVoir la console pour plus de détails`)
                  } catch (error: any) {
                    toast.error(`Erreur: ${error.message}`)
                  }
                }}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 mb-3"
                size="sm"
              >
                🔍 Vérifier l'état du compte
              </Button>
            </div>

            {/* Direct Access */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div>
                <p className="text-sm font-medium text-white mb-2">
                  🔗 Accès direct (connexion automatique):
                </p>
                <Button
                  onClick={() => router.push("/test/partner-venue/auto-login")}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Accès direct au dashboard partenaire venue
                </Button>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Cliquez pour vous connecter automatiquement et accéder au dashboard
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Ou accédez directement au dashboard (si déjà connecté):
                </p>
                <Button
                  onClick={() => router.push("/partner")}
                  variant="ghost"
                  className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  /partner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


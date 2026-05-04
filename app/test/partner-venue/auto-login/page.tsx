"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AutoLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState("Initialisation...")
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const supabase = createClient()

  const PARTNER_EMAIL = "venue.partner@teenclub.ma"
  const PARTNER_PASSWORD = "Test123!"

  useEffect(() => {
    async function autoLogin() {
      try {
        setStatus("Vérification de la connexion...")
        
        // Vérifier si déjà connecté
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          setStatus("Déjà connecté, vérification du rôle...")
          
          // Vérifier le rôle
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, email")
            .eq("id", currentUser.id)
            .single()
          
          if (profile?.role === "partner") {
            setStatus("Connexion réussie ! Redirection...")
            setTimeout(() => {
              router.push("/partner")
            }, 1000)
            return
          } else {
            setStatus("Déconnexion de l'utilisateur actuel...")
            await supabase.auth.signOut()
          }
        }

        setStatus("Connexion au compte partenaire venue...")
        
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: PARTNER_EMAIL,
          password: PARTNER_PASSWORD,
        })

        if (loginError) {
          const errorMessage = loginError.message
          setError(errorMessage)
          setStatus(`Erreur de connexion`)
          
          // Diagnostic détaillé
          setDebugInfo({
            errorCode: loginError.status || "unknown",
            errorMessage: errorMessage,
            email: PARTNER_EMAIL,
            suggestions: getSuggestions(loginError)
          })
          
          return
        }

        if (data.user) {
          setStatus("Connexion réussie ! Vérification du profil partenaire...")
          
          // Vérifier que le profil existe
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role, email, full_name")
            .eq("id", data.user.id)
            .single()
          
          if (profileError || profile?.role !== "partner") {
            setError(`Le compte existe mais n'a pas le rôle partenaire. Rôle actuel: ${profile?.role || "non trouvé"}`)
            setDebugInfo({
              userId: data.user.id,
              profileRole: profile?.role,
              profileEmail: profile?.email
            })
            return
          }

          // Vérifier que le partenaire existe dans la table partners
          const { data: partner, error: partnerError } = await supabase
            .from("partners")
            .select("id, company_name, partner_type, status")
            .eq("email", PARTNER_EMAIL)
            .single()
          
          if (partnerError || !partner) {
            setError(`Le compte existe mais n'est pas dans la table partners.`)
            setDebugInfo({
              userId: data.user.id,
              profileExists: !!profile,
              partnerExists: false
            })
            return
          }

          setStatus("Tout est OK ! Redirection vers le dashboard...")
          setTimeout(() => {
            router.push("/partner")
          }, 1500)
        } else {
          setError("Aucun utilisateur retourné après la connexion")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Erreur inconnue"
        setError(errorMessage)
        setStatus("Erreur")
        setDebugInfo({
          error: errorMessage,
          stack: err.stack
        })
      }
    }

    autoLogin()
  }, [router, supabase])

  function getSuggestions(error: any): string[] {
    const suggestions: string[] = []
    
    if (error.message?.includes("Invalid login credentials") || error.message?.includes("Email not confirmed")) {
      suggestions.push("Le compte n'existe peut-être pas ou le mot de passe est incorrect")
      suggestions.push("Vérifiez que le script create_test_accounts.sql a été exécuté")
      suggestions.push("Essayez de créer le compte manuellement via l'interface d'inscription")
    }
    
    if (error.message?.includes("Email rate limit")) {
      suggestions.push("Trop de tentatives de connexion. Attendez quelques minutes")
    }
    
    if (error.status === 400) {
      suggestions.push("Vérifiez que l'email et le mot de passe sont corrects")
    }
    
    return suggestions.length > 0 ? suggestions : ["Vérifiez les logs du serveur pour plus de détails"]
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-red-500/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Erreur de connexion</h2>
                  <p className="text-sm text-zinc-400">{status}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm font-medium text-red-400 mb-2">Message d'erreur:</p>
                <p className="text-white">{error}</p>
              </div>

              {debugInfo && (
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Informations de diagnostic:</p>
                  <pre className="text-xs text-zinc-400 overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}

              {debugInfo?.suggestions && debugInfo.suggestions.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm font-medium text-amber-400 mb-2">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                    {debugInfo.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => router.push("/test/partner-venue")}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300"
                >
                  Retour à la page de test
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto" />
        <p className="text-xl font-semibold text-white">{status}</p>
        <p className="text-sm text-zinc-400">
          {PARTNER_EMAIL}
        </p>
        {debugInfo && (
          <div className="mt-4 p-4 rounded-lg bg-zinc-800/50 max-w-md mx-auto">
            <pre className="text-xs text-zinc-400 text-left overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}


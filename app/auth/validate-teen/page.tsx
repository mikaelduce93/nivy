"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Shield,
  Heart,
  PartyPopper,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface RegistrationData {
  teenName: string
  teenAge: number
  parentEmail: string
  status: string
}

export default function ValidateTeenPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkAuthAndToken() {
      if (!token) {
        setError("Lien de validation invalide")
        setLoading(false)
        return
      }

      // Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Verify token
      try {
        const response = await fetch(`/api/auth/validate-teen?token=${token}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error)
        } else {
          setRegistration(data.data)
        }
      } catch (err) {
        setError("Erreur lors de la vérification")
      }

      setLoading(false)
    }

    checkAuthAndToken()
  }, [token])

  const handleApprove = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=/auth/validate-teen?token=${token}`)
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/auth/validate-teen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "approve" }),
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error)
        return
      }

      setSuccess(true)
      toast.success("Compte teen validé!")

      // Redirect to parent dashboard after 3 seconds
      setTimeout(() => {
        router.push("/parent/teens")
      }, 3000)
    } catch (err) {
      toast.error("Erreur lors de la validation")
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/auth/validate-teen?token=${token}`)
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/auth/validate-teen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reject" }),
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error)
        return
      }

      toast.info("Demande refusée")
      router.push("/")
    } catch (err) {
      toast.error("Erreur lors du refus")
    } finally {
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Vérification en cours...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500/5 via-background to-orange-500/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500/5 via-background to-emerald-500/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Compte validé!</h2>
            <p className="text-muted-foreground mb-4">
              {registration?.teenName} peut maintenant utiliser Teens Party.
            </p>
            <p className="text-sm text-green-600 mb-6">
              Redirection vers votre espace parent...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-green-500 mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main validation view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Validation de compte Teen</CardTitle>
          <CardDescription>
            {registration?.teenName} souhaite rejoindre Teens Party
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Teen Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold">{registration?.teenName}</p>
                <p className="text-sm text-muted-foreground">
                  {registration?.teenAge} ans
                </p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 mb-1">Votre rôle de parent</p>
              <p className="text-blue-600/80">
                En validant, vous pourrez superviser les activités de {registration?.teenName?.split(" ")[0]},
                approuver ses réservations et définir des limites de dépenses.
              </p>
            </div>
          </div>

          {/* Login prompt if not logged in */}
          {!isLoggedIn && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600">
                <strong>Connexion requise:</strong> Vous devez être connecté pour valider cette demande.
                Si vous n'avez pas encore de compte, vous pourrez en créer un.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReject}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Refuser
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isLoggedIn ? "Valider" : "Se connecter pour valider"}
            </Button>
          </div>

          {/* Help Link */}
          <p className="text-xs text-center text-muted-foreground">
            Vous ne connaissez pas cette personne?{" "}
            <Link href="/aide" className="text-primary hover:underline">
              Signaler un abus
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

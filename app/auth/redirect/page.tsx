"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthRedirectPage() {
  const router = useRouter()
  const [status, setStatus] = useState("Vérification de votre compte...")

  useEffect(() => {
    async function redirectBasedOnRole() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setStatus("Chargement de votre profil...")

      // Récupérer le profil et le rôle
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!profile) {
        // Nouveau utilisateur sans profil - envoyer vers onboarding
        router.push("/onboarding")
        return
      }

      setStatus("Redirection vers votre espace...")

      // Rediriger selon le rôle
      switch (profile.role) {
        case "teen":
          router.push("/teen")
          break
        case "parent":
          router.push("/parent")
          break
        case "ambassador":
          router.push("/ambassador")
          break
        case "partner":
          router.push("/partner")
          break
        case "admin":
          router.push("/admin")
          break
        default:
          // Fallback vers l'ancien dashboard ou onboarding
          router.push("/onboarding")
      }
    }

    redirectBasedOnRole()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Teen Club Morocco</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  )
}

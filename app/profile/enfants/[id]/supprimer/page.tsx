"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function SupprimerEnfantPage() {
  const params = useParams()
  const childId = params.id as string
  const [child, setChild] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChildData()
  }, [childId])

  const loadChildData = async () => {
    try {
      const { data, error } = await supabase.from("children").select("*").eq("id", childId).single()

      if (error) throw error
      setChild(data)
    } catch (error: any) {
      setError(error.message || "Erreur de chargement")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check for active enrollments or bookings
      const { data: enrollments } = await supabase
        .from("club_enrollments")
        .select("id")
        .eq("child_id", childId)
        .eq("status", "active")

      const { data: bookings } = await supabase.from("booking_tickets").select("id").eq("child_id", childId)

      if (enrollments && enrollments.length > 0) {
        throw new Error("Impossible de supprimer : cet enfant a des inscriptions actives aux clubs")
      }

      if (bookings && bookings.length > 0) {
        throw new Error("Impossible de supprimer : cet enfant a des réservations en cours")
      }

      const { error: deleteError } = await supabase.from("children").delete().eq("id", childId)

      if (deleteError) throw deleteError

      router.push("/profile/enfants?deleted=true")
    } catch (error: any) {
      setError(error.message || "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-zinc-950 py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-white text-center">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-zinc-950 py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-white text-center">Enfant introuvable</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 text-cyan-400 hover:text-cyan-300">
            <Link href="/profile/enfants">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card className="bg-zinc-900 border-red-500/50">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <CardTitle className="text-2xl text-white">Supprimer l'enfant</CardTitle>
              </div>
              <CardDescription>Cette action est irréversible</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-white font-semibold mb-2">
                    Êtes-vous sûr de vouloir supprimer le profil de {child.prenom} {child.nom} ?
                  </p>
                  <p className="text-sm text-zinc-400">
                    Toutes les données associées à cet enfant seront définitivement supprimées, y compris :
                  </p>
                  <ul className="text-sm text-zinc-400 mt-3 space-y-1 list-disc list-inside">
                    <li>Informations personnelles</li>
                    <li>Historique des réservations</li>
                    <li>Inscriptions aux clubs</li>
                    <li>Points de fidélité</li>
                  </ul>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-zinc-700"
                    onClick={() => router.push("/profile/enfants")}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isLoading ? "Suppression..." : "Supprimer définitivement"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

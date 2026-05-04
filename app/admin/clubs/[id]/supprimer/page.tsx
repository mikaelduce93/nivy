'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Trash2, Loader2, Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DeleteClubPage() {
  const router = useRouter()
  const params = useParams()
  const clubId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [club, setClub] = useState<any>(null)
  const [enrollmentsCount, setEnrollmentsCount] = useState(0)

  // Charger les données du club
  useEffect(() => {
    async function fetchClub() {
      try {
        const supabase = createClient()

        // Charger le club
        const { data: clubData, error: fetchError } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', clubId)
          .single()

        if (fetchError) throw fetchError

        setClub(clubData)

        // Compter les inscriptions
        const { count, error: countError } = await supabase
          .from('club_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)

        if (countError) throw countError

        setEnrollmentsCount(count || 0)
      } catch (error: unknown) {
        console.error('Error fetching club:', error)
        setError('Impossible de charger le club')
      } finally {
        setIsFetching(false)
      }
    }

    fetchClub()
  }, [clubId])

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Supprimer le club
      const { error: deleteError } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId)

      if (deleteError) throw deleteError

      // Rediriger vers la page de liste des clubs
      router.push('/admin/clubs')
      router.refresh()
    } catch (error: unknown) {
      console.error('Error deleting club:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Une erreur est survenue lors de la suppression du club')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Chargement du club...</p>
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-zinc-400 text-center mb-4">Club non trouvé</p>
            <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href="/admin/clubs">Retour aux clubs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-4 bg-transparent border-zinc-700 text-zinc-300">
            <Link href="/admin/clubs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux clubs
            </Link>
          </Button>
          <h1 className="text-4xl font-black text-white mb-2">Supprimer le club</h1>
          <p className="text-zinc-400">Cette action est irréversible</p>
        </div>

        <div className="max-w-2xl">
          {error && (
            <Card className="mb-6 bg-red-500/10 border-red-500/50">
              <CardContent className="pt-6">
                <p className="text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Avertissement */}
          <Card className="mb-6 bg-red-500/10 border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Attention !
              </CardTitle>
              <CardDescription className="text-red-300/70">
                Vous êtes sur le point de supprimer ce club de manière permanente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-red-300/90">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Cette action est <strong>irréversible</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Toutes les inscriptions associées seront également supprimées</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Les membres inscrits ne pourront plus accéder au club</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Informations sur le club */}
          <Card className="mb-6 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Club à supprimer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {club.image_url && (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={club.image_url}
                      alt={club.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{club.name}</h3>
                  <div className="space-y-1 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>{club.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <span>{club.venue_name}, {club.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>Capacité: {club.capacity} personnes</span>
                    </div>
                  </div>
                </div>
              </div>

              {enrollmentsCount > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg">
                  <p className="text-orange-400 font-semibold">
                    ⚠️ Ce club a {enrollmentsCount} inscription{enrollmentsCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-orange-300/70 text-sm mt-1">
                    Les membres inscrits ne pourront plus accéder au club
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Confirmer la suppression</CardTitle>
              <CardDescription className="text-zinc-400">
                Êtes-vous absolument sûr de vouloir supprimer ce club ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={handleDelete}
                  disabled={isLoading}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Suppression en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Oui, supprimer définitivement
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-zinc-700 text-zinc-300"
                >
                  <Link href="/admin/clubs">
                    Non, annuler
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

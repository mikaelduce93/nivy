'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { FieldInput } from '@/components/ui/field-input'
import { DarkSurface, NivCoach, Niv } from '@/components/brand'
import { AlertCircle, ArrowLeft, Trash2, Loader2, Calendar, MapPin, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DeleteEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [bookingsCount, setBookingsCount] = useState(0)
  // Friction de sécurité (présentation) : resaisie du titre pour débloquer.
  const [confirmTitle, setConfirmTitle] = useState('')

  // Charger les données de l'événement
  useEffect(() => {
    async function fetchEvent() {
      try {
        const supabase = createClient()

        // Charger l'événement
        const { data: eventData, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (fetchError) throw fetchError

        setEvent(eventData)

        // Compter les réservations
        const { count, error: countError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)

        if (countError) throw countError

        setBookingsCount(count || 0)
      } catch (error: unknown) {
        console.error('Error fetching event:', error)
        setError('Impossible de charger l\'événement')
      } finally {
        setIsFetching(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Supprimer l'événement
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (deleteError) throw deleteError

      // Rediriger vers la page de liste des événements
      router.push('/admin/evenements')
      router.refresh()
    } catch (error: unknown) {
      console.error('Error deleting event:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Une erreur est survenue lors de la suppression de l\'événement')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Niv mood="calm" size={72} />
          <p className="text-mute">On récupère l'événement...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <StickerCard className="max-w-md items-center gap-4 p-8 text-center">
          <p className="text-mute">Événement introuvable.</p>
          <Button
            asChild
            className="rounded-full border-2 border-ink bg-ink text-paper shadow-stkr-pink hover:bg-ink hover:text-paper"
          >
            <Link href="/admin/evenements">Retour aux événements</Link>
          </Button>
        </StickerCard>
      </div>
    )
  }

  const titleConfirmed = confirmTitle.trim() === (event.title ?? '').trim()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-4 border-2 border-ink bg-transparent text-ink">
            <Link href="/admin/evenements">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux événements
            </Link>
          </Button>
          <p className="eyebrow tracking-[0.16em] text-coral">Action irréversible</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Supprimer l'<em className="font-semibold italic text-coral">événement</em>
          </h1>
          <p className="mt-2 text-mute">Cette action ne peut pas être annulée.</p>
        </div>

        <div className="max-w-2xl space-y-6">
          {error && (
            <StickerCard className="border-coral p-5 shadow-stkr-md">
              <p className="text-coral">{error}</p>
            </StickerCard>
          )}

          {/* Avertissement */}
          <StickerCard className="gap-4 border-coral p-6 shadow-stkr-pink">
            <p className="eyebrow tracking-[0.16em] text-coral flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Action irréversible
            </p>
            <p className="text-sm text-mute">
              Tu es sur le point de supprimer cet événement de manière permanente.
            </p>
            <ul className="space-y-2 text-sm text-ink-2">
              <li className="flex items-start gap-2">
                <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                <span>Cette action est <strong>irréversible</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                <span>Toutes les réservations associées seront également supprimées.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                <span>Les billets déjà vendus ne seront plus valides.</span>
              </li>
            </ul>
          </StickerCard>

          {bookingsCount > 0 && (
            <NivCoach
              mood="calm"
              message={`Tu es sûr ? Ça supprimera aussi ${bookingsCount} résa${bookingsCount > 1 ? 's' : ''}, frérot.`}
            />
          )}

          {/* Informations sur l'événement */}
          <StickerCard className="gap-4 p-6">
            <p className="eyebrow tracking-[0.16em] text-mute">Événement à supprimer</p>
            <div className="flex gap-4">
              {event.image_url && (
                <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg border-2 border-ink">
                  <Image
                    src={event.image_url}
                    alt={event.title}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="mb-2 font-display text-xl font-extrabold tracking-tight text-ink">{event.title}</h3>
                <div className="space-y-1 text-sm text-mute">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal" />
                    <span>
                      {new Date(event.event_date).toLocaleDateString('fr-FR')} à {event.event_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal" />
                    <span>{event.venue_name}, {event.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal" />
                    <span>Capacité : {event.capacity} personnes</span>
                  </div>
                </div>
              </div>
            </div>

            {bookingsCount > 0 && (
              <DarkSurface tone="coral" shadow className="p-5">
                <span className="eyebrow tracking-[0.16em] text-paper/60">Réservations impactées</span>
                <p className="mt-1 font-display text-[40px] font-extrabold leading-none tabular-nums text-coral">
                  {bookingsCount}
                </p>
                <p className="mt-2 text-sm text-paper/70">
                  Les clients ayant réservé ne pourront plus accéder à leurs billets.
                </p>
              </DarkSurface>
            )}
          </StickerCard>

          {/* Confirmation */}
          <StickerCard className="gap-4 p-6">
            <p className="eyebrow tracking-[0.16em] text-mute">Confirmer la suppression</p>
            <p className="text-sm text-mute">
              Pour confirmer, resaisis le titre exact de l'événement ci-dessous.
            </p>
            <FieldInput
              label="Titre de l'événement"
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder={event.title}
              success={titleConfirmed}
            />
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleDelete}
                disabled={isLoading || !titleConfirmed}
                className="rounded-full border-2 border-ink bg-coral text-paper shadow-stkr-md hover:bg-coral hover:text-paper disabled:opacity-50"
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
                className="border-2 border-ink bg-transparent text-ink"
              >
                <Link href="/admin/evenements">
                  Non, annuler
                </Link>
              </Button>
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  )
}

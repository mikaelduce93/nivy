'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { FieldInput } from '@/components/ui/field-input'
import { SelectSticker, SelectStickerItem } from '@/components/ui/select-sticker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SegmentedProgress } from '@/components/ui/progress'
import { NivCoach } from '@/components/brand'
import { Calendar, Clock, MapPin, Users, Coins, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VIPPricePreview from '@/components/admin/VIPPricePreview'

// Fonction pour générer un slug à partir du titre
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Enlever les tirets au début et à la fin
}

export default function CreateEventPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('Casablanca')
  const [capacity, setCapacity] = useState('100')
  const [basePrice, setBasePrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('party')
  const [ageMin, setAgeMin] = useState('13')
  const [ageMax, setAgeMax] = useState('17')

  // Auto-générer le slug quand le titre change
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (value) {
      setSlug(generateSlug(value))
    } else {
      setSlug('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!title || !slug || !eventDate || !eventTime || !venueName || !venueAddress || !city || !basePrice) {
      setError('Veuillez remplir tous les champs obligatoires')
      setIsLoading(false)
      return
    }

    if (parseInt(capacity) <= 0) {
      setError('La capacité doit être supérieure à 0')
      setIsLoading(false)
      return
    }

    if (parseFloat(basePrice) <= 0) {
      setError('Le prix de base doit être supérieur à 0')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Créer l'événement
      const eventData = {
        title,
        slug,
        description: description || null,
        event_date: eventDate,
        event_time: eventTime,
        end_time: endTime || null,
        venue_name: venueName,
        venue_address: venueAddress,
        city,
        capacity: parseInt(capacity),
        available_spots: parseInt(capacity), // Initialement égal à la capacité
        base_price: parseFloat(basePrice),
        image_url: imageUrl || null,
        category,
        status: 'upcoming',
        age_min: parseInt(ageMin),
        age_max: parseInt(ageMax),
      }

      const { data, error: insertError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (insertError) throw insertError

      // Rediriger vers la page de liste des événements
      router.push('/admin/evenements')
      router.refresh()
    } catch (error: unknown) {
      console.error('Error creating event:', error)
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          setError('Un événement avec ce slug existe déjà')
        } else {
          setError(error.message)
        }
      } else {
        setError('Une erreur est survenue lors de la création de l\'événement')
      }
    } finally {
      setIsLoading(false)
    }
  }

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
          <p className="eyebrow tracking-[0.16em] text-pink">Admin · Nouvel événement</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Créer un <em className="font-semibold italic text-pink">événement</em>
          </h1>
          <p className="mt-2 text-mute">Renseigne les infos ci-dessous pour lancer une nouvelle date.</p>
        </div>

        {/* Carte d'étapes du formulaire */}
        <div className="mb-6">
          <SegmentedProgress
            steps={5}
            current={0}
            size="md"
            showLabel
            label="Infos · Date · Lieu · Capacité · Prix"
          />
        </div>

        <NivCoach
          className="mb-6"
          mood="happy"
          message="Un titre clair et une belle image, c'est ça qui fait vendre les billets, frérot."
        />

        {error && (
          <StickerCard className="mb-6 border-coral p-5 shadow-stkr-md">
            <p className="text-coral">{error}</p>
          </StickerCard>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informations de base */}
            <StickerCard className="gap-4 p-6">
              <div>
                <p className="eyebrow tracking-[0.16em] text-mute">Informations de base</p>
                <p className="mt-1 text-sm text-mute">Les informations principales de l'événement.</p>
              </div>

              <FieldInput
                id="title"
                label="Titre de l'événement *"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex : Soirée Teens Party - Casablanca"
                required
              />

              <FieldInput
                id="slug"
                label="Slug (URL) *"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="soiree-teens-party-casablanca"
                hint="Généré automatiquement à partir du titre"
                className="font-mono text-sm"
                required
              />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description" className="eyebrow tracking-[0.16em]">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décris ton événement..."
                  className="min-h-32 border-2 border-ink"
                  rows={4}
                />
              </div>

              <SelectSticker
                label="Catégorie *"
                value={category}
                onValueChange={setCategory}
              >
                <SelectStickerItem value="party">Soirée / Party</SelectStickerItem>
                <SelectStickerItem value="concert">Concert</SelectStickerItem>
                <SelectStickerItem value="workshop">Atelier</SelectStickerItem>
                <SelectStickerItem value="sport">Sport</SelectStickerItem>
                <SelectStickerItem value="cultural">Culturel</SelectStickerItem>
                <SelectStickerItem value="other">Autre</SelectStickerItem>
              </SelectSticker>

              <FieldInput
                id="imageUrl"
                label="URL de l'image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </StickerCard>

            {/* Date et heure */}
            <StickerCard className="gap-4 p-6">
              <div>
                <p className="eyebrow tracking-[0.16em] text-mute flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date et heure
                </p>
                <p className="mt-1 text-sm text-mute">Quand aura lieu l'événement ?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput
                  id="eventDate"
                  label="Date de l'événement *"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
                <FieldInput
                  id="eventTime"
                  label="Heure de début *"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>

              <FieldInput
                id="endTime"
                label="Heure de fin (optionnel)"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </StickerCard>

            {/* Lieu */}
            <StickerCard className="gap-4 p-6">
              <div>
                <p className="eyebrow tracking-[0.16em] text-mute flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lieu de l'événement
                </p>
                <p className="mt-1 text-sm text-mute">Où aura lieu l'événement ?</p>
              </div>

              <FieldInput
                id="venueName"
                label="Nom du lieu *"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Ex : Salle des fêtes Anfa"
                required
              />

              <FieldInput
                id="venueAddress"
                label="Adresse *"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Ex : Boulevard de la Corniche, Casablanca"
                required
              />

              <SelectSticker label="Ville *" value={city} onValueChange={setCity}>
                <SelectStickerItem value="Casablanca">Casablanca</SelectStickerItem>
                <SelectStickerItem value="Rabat">Rabat</SelectStickerItem>
                <SelectStickerItem value="Marrakech">Marrakech</SelectStickerItem>
                <SelectStickerItem value="Fès">Fès</SelectStickerItem>
                <SelectStickerItem value="Tanger">Tanger</SelectStickerItem>
                <SelectStickerItem value="Agadir">Agadir</SelectStickerItem>
                <SelectStickerItem value="Meknès">Meknès</SelectStickerItem>
                <SelectStickerItem value="Oujda">Oujda</SelectStickerItem>
                <SelectStickerItem value="Kenitra">Kenitra</SelectStickerItem>
                <SelectStickerItem value="Tétouan">Tétouan</SelectStickerItem>
              </SelectSticker>
            </StickerCard>

            {/* Capacité */}
            <StickerCard className="gap-4 p-6">
              <div>
                <p className="eyebrow tracking-[0.16em] text-mute flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Capacité et restrictions d'âge
                </p>
                <p className="mt-1 text-sm text-mute">Combien de personnes et quel âge ?</p>
              </div>

              <FieldInput
                id="capacity"
                label="Capacité maximale *"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="100"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput
                  id="ageMin"
                  label="Âge minimum"
                  type="number"
                  min="1"
                  max="99"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                />
                <FieldInput
                  id="ageMax"
                  label="Âge maximum"
                  type="number"
                  min="1"
                  max="99"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                />
              </div>
            </StickerCard>

            {/* Tarification */}
            <StickerCard className="gap-4 p-6">
              <div>
                <p className="eyebrow tracking-[0.16em] text-mute flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Tarification
                </p>
                <p className="mt-1 text-sm text-mute">
                  Prix de base (les réductions VIP seront calculées automatiquement).
                </p>
              </div>

              <FieldInput
                id="basePrice"
                label="Prix de base (DH) *"
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="150.00"
                hint="Les détenteurs de cartes VIP bénéficieront de réductions automatiques"
                className="font-mono"
                required
              />
            </StickerCard>

            {/* Aperçu des prix VIP — mis en avant */}
            <StickerCard variant="hover" className="gap-4 p-6 shadow-stkr-pink">
              <p className="eyebrow tracking-[0.16em] text-pink">Aperçu des tarifs VIP</p>
              <VIPPricePreview basePrice={basePrice} currency="DH" />
            </StickerCard>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-full border-2 border-ink bg-ink text-paper shadow-stkr-pink hover:bg-ink hover:text-paper"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Créer l'événement
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/evenements')}
                className="border-2 border-ink bg-transparent text-ink"
              >
                Annuler
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

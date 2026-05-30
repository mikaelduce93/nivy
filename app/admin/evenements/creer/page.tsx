'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, MapPin, Users, DollarSign, Image as ImageIcon, ArrowLeft, Save } from 'lucide-react'
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
      <div className="container mx-auto px-6 py-32">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-4 bg-transparent border-ink text-ink-2">
            <Link href="/admin/evenements">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux événements
            </Link>
          </Button>
          <h1 className="text-4xl font-black text-ink mb-2">Créer un événement</h1>
          <p className="text-mute">Remplissez les informations ci-dessous pour créer un nouvel événement</p>
        </div>

        {error && (
          <Card className="mb-6 bg-destructive/10 border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informations de base */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink">Informations de base</CardTitle>
                <CardDescription className="text-mute">
                  Les informations principales de l'événement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-ink-2">
                    Titre de l'événement <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Soirée Teens Party - Casablanca"
                    className="bg-background border-ink text-ink"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-ink-2">
                    Slug (URL) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="soiree-teens-party-casablanca"
                    className="bg-background border-ink text-ink font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-mute">Généré automatiquement à partir du titre</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-ink-2">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre événement..."
                    className="bg-background border-ink text-ink min-h-32"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-ink-2">
                    Catégorie <span className="text-destructive">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background border-ink text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-ink">
                      <SelectItem value="party">Soirée / Party</SelectItem>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="workshop">Atelier</SelectItem>
                      <SelectItem value="sport">Sport</SelectItem>
                      <SelectItem value="cultural">Culturel</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-ink-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    URL de l'image
                  </Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-background border-ink text-ink"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date et heure */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date et heure
                </CardTitle>
                <CardDescription className="text-mute">
                  Quand aura lieu l'événement ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate" className="text-ink-2">
                      Date de l'événement <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="bg-background border-ink text-ink"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventTime" className="text-ink-2">
                      Heure de début <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="bg-background border-ink text-ink"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-ink-2">
                    Heure de fin (optionnel)
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-background border-ink text-ink"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lieu */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Lieu de l'événement
                </CardTitle>
                <CardDescription className="text-mute">
                  Où aura lieu l'événement ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName" className="text-ink-2">
                    Nom du lieu <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venueName"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Ex: Salle des fêtes Anfa"
                    className="bg-background border-ink text-ink"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venueAddress" className="text-ink-2">
                    Adresse <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venueAddress"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Ex: Boulevard de la Corniche, Casablanca"
                    className="bg-background border-ink text-ink"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-ink-2">
                    Ville <span className="text-destructive">*</span>
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="bg-background border-ink text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-ink">
                      <SelectItem value="Casablanca">Casablanca</SelectItem>
                      <SelectItem value="Rabat">Rabat</SelectItem>
                      <SelectItem value="Marrakech">Marrakech</SelectItem>
                      <SelectItem value="Fès">Fès</SelectItem>
                      <SelectItem value="Tanger">Tanger</SelectItem>
                      <SelectItem value="Agadir">Agadir</SelectItem>
                      <SelectItem value="Meknès">Meknès</SelectItem>
                      <SelectItem value="Oujda">Oujda</SelectItem>
                      <SelectItem value="Kenitra">Kenitra</SelectItem>
                      <SelectItem value="Tétouan">Tétouan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Capacité */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Capacité et restrictions d'âge
                </CardTitle>
                <CardDescription className="text-mute">
                  Combien de personnes et quel âge ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-ink-2">
                    Capacité maximale <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="100"
                    className="bg-background border-ink text-ink"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ageMin" className="text-ink-2">
                      Âge minimum
                    </Label>
                    <Input
                      id="ageMin"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="bg-background border-ink text-ink"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ageMax" className="text-ink-2">
                      Âge maximum
                    </Label>
                    <Input
                      id="ageMax"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="bg-background border-ink text-ink"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarification */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tarification
                </CardTitle>
                <CardDescription className="text-mute">
                  Prix de base (les réductions VIP seront calculées automatiquement)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice" className="text-ink-2">
                    Prix de base (DH) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="150.00"
                    className="bg-background border-ink text-ink"
                    required
                  />
                  <p className="text-xs text-mute">
                    Les détenteurs de cartes VIP bénéficieront de réductions automatiques
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Aperçu des prix VIP */}
            <VIPPricePreview basePrice={basePrice} currency="DH" />

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal"
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
                className="bg-transparent border-ink text-ink-2"
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

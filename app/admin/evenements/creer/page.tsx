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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-4 bg-transparent border-zinc-700 text-zinc-300">
            <Link href="/admin/evenements">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux événements
            </Link>
          </Button>
          <h1 className="text-4xl font-black text-white mb-2">Créer un événement</h1>
          <p className="text-zinc-400">Remplissez les informations ci-dessous pour créer un nouvel événement</p>
        </div>

        {error && (
          <Card className="mb-6 bg-red-500/10 border-red-500/50">
            <CardContent className="pt-6">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informations de base */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Informations de base</CardTitle>
                <CardDescription className="text-zinc-400">
                  Les informations principales de l'événement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-zinc-300">
                    Titre de l'événement <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Soirée Teens Party - Casablanca"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-zinc-300">
                    Slug (URL) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="soiree-teens-party-casablanca"
                    className="bg-zinc-950 border-zinc-700 text-white font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-zinc-500">Généré automatiquement à partir du titre</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-zinc-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre événement..."
                    className="bg-zinc-950 border-zinc-700 text-white min-h-32"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-zinc-300">
                    Catégorie <span className="text-red-400">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
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
                  <Label htmlFor="imageUrl" className="text-zinc-300 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    URL de l'image
                  </Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Date et heure */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date et heure
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Quand aura lieu l'événement ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate" className="text-zinc-300">
                      Date de l'événement <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventTime" className="text-zinc-300">
                      Heure de début <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-zinc-300">
                    Heure de fin (optionnel)
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lieu */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Lieu de l'événement
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Où aura lieu l'événement ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName" className="text-zinc-300">
                    Nom du lieu <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="venueName"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Ex: Salle des fêtes Anfa"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venueAddress" className="text-zinc-300">
                    Adresse <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="venueAddress"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Ex: Boulevard de la Corniche, Casablanca"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-zinc-300">
                    Ville <span className="text-red-400">*</span>
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Capacité et restrictions d'âge
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Combien de personnes et quel âge ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-zinc-300">
                    Capacité maximale <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="100"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ageMin" className="text-zinc-300">
                      Âge minimum
                    </Label>
                    <Input
                      id="ageMin"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ageMax" className="text-zinc-300">
                      Âge maximum
                    </Label>
                    <Input
                      id="ageMax"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarification */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tarification
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Prix de base (les réductions VIP seront calculées automatiquement)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice" className="text-zinc-300">
                    Prix de base (DH) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="150.00"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                  <p className="text-xs text-zinc-500">
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
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
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
                className="bg-transparent border-zinc-700 text-zinc-300"
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

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
import { Award, Calendar, MapPin, Users, Image as ImageIcon, ArrowLeft, Save, User, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ScheduleSelector, { type Schedule } from '@/components/admin/ScheduleSelector'
import VIPPricePreview from '@/components/admin/VIPPricePreview'

// Fonction pour générer un slug à partir du nom
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateClubPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('sport')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('Casablanca')
  const [capacity, setCapacity] = useState('20')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [ageMin, setAgeMin] = useState('13')
  const [ageMax, setAgeMax] = useState('17')
  const [imageUrl, setImageUrl] = useState('')
  const [instructorName, setInstructorName] = useState('')
  const [instructorBio, setInstructorBio] = useState('')

  // Auto-générer le slug quand le nom change
  const handleNameChange = (value: string) => {
    setName(value)
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
    if (!name || !slug || !venueName || !venueAddress || !city || !monthlyPrice) {
      setError('Veuillez remplir tous les champs obligatoires')
      setIsLoading(false)
      return
    }

    if (schedules.length === 0) {
      setError('Veuillez ajouter au moins un horaire')
      setIsLoading(false)
      return
    }

    if (parseInt(capacity) <= 0) {
      setError('La capacité doit être supérieure à 0')
      setIsLoading(false)
      return
    }

    if (parseFloat(monthlyPrice) <= 0) {
      setError('Le prix mensuel doit être supérieur à 0')
      setIsLoading(false)
      return
    }

    if (parseInt(ageMin) > parseInt(ageMax)) {
      setError('L\'âge minimum ne peut pas être supérieur à l\'âge maximum')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Créer le club
      const clubData = {
        name,
        slug,
        description: description || null,
        category,
        schedules: schedules, // Le trigger auto-générera le champ schedule
        venue_name: venueName,
        venue_address: venueAddress,
        city,
        capacity: parseInt(capacity),
        enrolled_count: 0,
        monthly_price: parseFloat(monthlyPrice),
        age_min: parseInt(ageMin),
        age_max: parseInt(ageMax),
        image_url: imageUrl || null,
        status: 'active',
        instructor_name: instructorName || null,
        instructor_bio: instructorBio || null,
      }

      const { data, error: insertError } = await supabase
        .from('clubs')
        .insert([clubData])
        .select()
        .single()

      if (insertError) throw insertError

      // Rediriger vers la page de liste des clubs
      router.push('/admin/clubs')
      router.refresh()
    } catch (error: unknown) {
      console.error('Error creating club:', error)
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          setError('Un club avec ce slug existe déjà')
        } else {
          setError(error.message)
        }
      } else {
        setError('Une erreur est survenue lors de la création du club')
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
            <Link href="/admin/clubs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux clubs
            </Link>
          </Button>
          <h1 className="text-4xl font-black text-white mb-2">Créer un nouveau club</h1>
          <p className="text-zinc-400">Ajoutez un club pour les adolescents</p>
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
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Informations de base
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Les informations principales du club
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">
                    Nom du club <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Football Teens"
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
                    placeholder="football-teens"
                    className="bg-zinc-950 border-zinc-700 text-white font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-zinc-500">Généré automatiquement à partir du nom</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-zinc-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre club..."
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
                      <SelectItem value="sport">Sport</SelectItem>
                      <SelectItem value="dance">Danse</SelectItem>
                      <SelectItem value="music">Musique</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="tech">Technologie</SelectItem>
                      <SelectItem value="theatre">Théâtre</SelectItem>
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

            {/* Horaires */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Horaires
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Définissez les jours et horaires des séances. Vous pouvez ajouter plusieurs créneaux.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleSelector schedules={schedules} onChange={setSchedules} />
              </CardContent>
            </Card>

            {/* Lieu */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Lieu des séances
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Où ont lieu les activités ?
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
                    placeholder="Ex: Terrain de football Anfa"
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

            {/* Capacité et restrictions d'âge */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Capacité et restrictions d'âge
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Combien de participants et quel âge ?
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
                    placeholder="20"
                    className="bg-zinc-950 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ageMin" className="text-zinc-300">
                      Âge minimum <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="ageMin"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ageMax" className="text-zinc-300">
                      Âge maximum <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="ageMax"
                      type="number"
                      min="1"
                      max="99"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 text-white"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarification */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Tarification mensuelle
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Prix de base mensuel (les réductions VIP seront calculées automatiquement)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice" className="text-zinc-300">
                    Prix mensuel (DH) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    placeholder="200.00"
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
            <VIPPricePreview basePrice={monthlyPrice} currency="DH" />

            {/* Instructeur */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Instructeur
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Informations sur l'instructeur (optionnel)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructorName" className="text-zinc-300">
                    Nom de l'instructeur
                  </Label>
                  <Input
                    id="instructorName"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="Ex: Ahmed El Fassi"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructorBio" className="text-zinc-300">
                    Biographie de l'instructeur
                  </Label>
                  <Textarea
                    id="instructorBio"
                    value={instructorBio}
                    onChange={(e) => setInstructorBio(e.target.value)}
                    placeholder="Parlez de l'expérience et des qualifications de l'instructeur..."
                    className="bg-zinc-950 border-zinc-700 text-white min-h-24"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {isLoading ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Créer le club
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/clubs')}
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

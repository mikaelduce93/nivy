"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Mic2, Music, Send, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

export default function DJCandidaturePage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    stageName: "",
    email: "",
    phone: "",
    city: "",
    age: "",

    // Expérience
    experienceYears: "",
    djStyle: [] as string[],
    equipment: "",

    // Performances
    previousVenues: "",
    crowdSize: "",
    eventTypes: [] as string[],

    // Musique et mix
    spotifyUrl: "",
    soundcloudUrl: "",
    mixcloudUrl: "",
    youtubeUrl: "",

    // Disponibilité
    availability: "",
    willingToTravel: false,

    // Motivation
    whyTeenParty: "",
    setDescription: "",

    // Réseaux sociaux
    instagram: "",
    tiktok: "",
  })

  const [spotifyEmbed, setSpotifyEmbed] = useState("")

  const handleSpotifyUrl = (url: string) => {
    setFormData({...formData, spotifyUrl: url})

    // Convertir le lien Spotify en embed
    if (url.includes('spotify.com')) {
      // Extraire l'ID du track/playlist/album
      const spotifyId = url.split('/').pop()?.split('?')[0]
      const type = url.includes('/track/') ? 'track'
                 : url.includes('/playlist/') ? 'playlist'
                 : url.includes('/album/') ? 'album'
                 : url.includes('/artist/') ? 'artist'
                 : null

      if (spotifyId && type) {
        setSpotifyEmbed(`https://open.spotify.com/embed/${type}/${spotifyId}`)
      }
    } else {
      setSpotifyEmbed("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Wave 4B — replace alert() with sonner toast (canon §0).
      // Backend wiring is the canonical /devenir-dj wizard (Wave 3B.1) —
      // this legacy page should redirect there in a follow-up. For now
      // we honest-toast and stop pretending we sent something.
      toast.info(
        "Cette page legacy ne soumet pas de candidature. Utilise /devenir-dj pour postuler officiellement.",
        { duration: 6000 },
      )
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de l'envoi")
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleDjStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      djStyle: prev.djStyle.includes(style)
        ? prev.djStyle.filter(s => s !== style)
        : [...prev.djStyle, style]
    }))
  }

  const toggleEventType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(type)
        ? prev.eventTypes.filter(t => t !== type)
        : [...prev.eventTypes, type]
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black mb-4">
              Candidature <span className="text-gradient">DJ</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Rejoins notre team de DJs et enflamme nos événements Teen Party
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informations personnelles */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Mic2 className="w-6 h-6 text-coral" />
                Informations personnelles
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fullName" className="text-ink-2">Nom complet *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stageName" className="text-ink-2">Nom de scène (DJ Name) *</Label>
                  <Input
                    id="stageName"
                    value={formData.stageName}
                    onChange={(e) => setFormData({...formData, stageName: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="DJ Shadow"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-ink-2">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-ink-2">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-ink-2">Ville *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="age" className="text-ink-2">Âge *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Expérience */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Music className="w-6 h-6 text-coral" />
                Expérience et style
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="text-ink-2">Années d'expérience *</Label>
                  <Select value={formData.experienceYears} onValueChange={(value) => setFormData({...formData, experienceYears: value})}>
                    <SelectTrigger className="bg-background border-ink text-ink mt-2">
                      <SelectValue placeholder="Sélectionne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant (&lt; 1 an)</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire (1-3 ans)</SelectItem>
                      <SelectItem value="experienced">Expérimenté (3-5 ans)</SelectItem>
                      <SelectItem value="professional">Professionnel (5+ ans)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-ink-2">Taille moyenne du public</Label>
                  <Input
                    value={formData.crowdSize}
                    onChange={(e) => setFormData({...formData, crowdSize: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="50-200 personnes"
                  />
                </div>
              </div>

              <div className="mb-6">
                <Label className="text-ink-2 mb-4 block">Styles musicaux *</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  {['House', 'Techno', 'Hip-Hop', 'RnB', 'EDM', 'Pop', 'Afrobeat', 'Reggaeton', 'Trap'].map((style) => (
                    <div key={style} className="flex items-center gap-2">
                      <Checkbox
                        id={style}
                        checked={formData.djStyle.includes(style)}
                        onCheckedChange={() => toggleDjStyle(style)}
                      />
                      <label htmlFor={style} className="text-sm text-ink-2 cursor-pointer">{style}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <Label className="text-ink-2 mb-4 block">Types d'événements</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  {['Soirées privées', 'Clubs', 'Festivals', 'Mariages', 'Événements corporatifs', 'Bars/Lounges'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={type}
                        checked={formData.eventTypes.includes(type)}
                        onCheckedChange={() => toggleEventType(type)}
                      />
                      <label htmlFor={type} className="text-sm text-ink-2 cursor-pointer">{type}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-ink-2">Équipement</Label>
                <Textarea
                  value={formData.equipment}
                  onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                  className="bg-background border-ink text-ink mt-2"
                  rows={3}
                  placeholder="Pioneer DDJ-400, Laptop avec Rekordbox, enceintes JBL..."
                />
              </div>

              <div className="mt-6">
                <Label className="text-ink-2">Lieux/événements où tu as mixé</Label>
                <Textarea
                  value={formData.previousVenues}
                  onChange={(e) => setFormData({...formData, previousVenues: e.target.value})}
                  className="bg-background border-ink text-ink mt-2"
                  rows={3}
                  placeholder="Club XYZ à Casablanca, Festival Music Fest 2024..."
                />
              </div>
            </Card>

            {/* Musique et mixes */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6">Tes mixes et productions</h2>
              <p className="text-sm text-mute mb-6">
                Partage tes meilleures productions pour qu'on puisse évaluer ton style
              </p>

              <div className="space-y-6">
                {/* Spotify */}
                <div className="p-6 bg-lime/5 border border-lime/20 rounded-xl">
                  <Label className="text-ink-2 flex items-center gap-2 mb-3">
                    <Music className="w-5 h-5 text-lime" />
                    Lien Spotify (Recommandé) 🎵
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={formData.spotifyUrl}
                      onChange={(e) => handleSpotifyUrl(e.target.value)}
                      className="bg-background border-ink text-ink"
                      placeholder="https://open.spotify.com/track/..."
                    />
                    {formData.spotifyUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(formData.spotifyUrl, '_blank')}
                        className="border-ink"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-mute mt-2">
                    Colle le lien de ta playlist, album ou track Spotify
                  </p>

                  {/* Lecteur Spotify intégré */}
                  {spotifyEmbed && (
                    <div className="mt-4">
                      <p className="text-sm text-lime mb-2">Aperçu de ton mix :</p>
                      <iframe
                        title="Aperçu Spotify"
                        src={spotifyEmbed}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* SoundCloud */}
                <div>
                  <Label className="text-ink-2">Lien SoundCloud</Label>
                  <Input
                    type="url"
                    value={formData.soundcloudUrl}
                    onChange={(e) => setFormData({...formData, soundcloudUrl: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="https://soundcloud.com/..."
                  />
                </div>

                {/* Mixcloud */}
                <div>
                  <Label className="text-ink-2">Lien Mixcloud</Label>
                  <Input
                    type="url"
                    value={formData.mixcloudUrl}
                    onChange={(e) => setFormData({...formData, mixcloudUrl: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="https://mixcloud.com/..."
                  />
                </div>

                {/* YouTube */}
                <div>
                  <Label className="text-ink-2">Lien YouTube (Live sets, vidéos)</Label>
                  <Input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </Card>

            {/* Réseaux sociaux */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6">Réseaux sociaux</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-ink-2">Instagram</Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="@tonpseudo"
                  />
                </div>
                <div>
                  <Label className="text-ink-2">TikTok</Label>
                  <Input
                    value={formData.tiktok}
                    onChange={(e) => setFormData({...formData, tiktok: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    placeholder="@tonpseudo"
                  />
                </div>
              </div>
            </Card>

            {/* Disponibilité */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6">Disponibilité</h2>

              <div className="space-y-6">
                <div>
                  <Label className="text-ink-2">Disponibilités *</Label>
                  <Textarea
                    value={formData.availability}
                    onChange={(e) => setFormData({...formData, availability: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    rows={3}
                    placeholder="Weekends, vacances scolaires, soirées en semaine..."
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="willingToTravel"
                    checked={formData.willingToTravel}
                    onCheckedChange={(checked) => setFormData({...formData, willingToTravel: checked as boolean})}
                  />
                  <label htmlFor="willingToTravel" className="text-ink-2 cursor-pointer">
                    Je suis prêt(e) à me déplacer dans d'autres villes
                  </label>
                </div>
              </div>
            </Card>

            {/* Motivation */}
            <Card className="p-8 bg-card border-ink">
              <h2 className="text-2xl font-bold mb-6">Motivation</h2>

              <div className="space-y-6">
                <div>
                  <Label className="text-ink-2">Pourquoi veux-tu rejoindre Teen Party? *</Label>
                  <Textarea
                    value={formData.whyTeenParty}
                    onChange={(e) => setFormData({...formData, whyTeenParty: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label className="text-ink-2">Décris ton set idéal pour une soirée Teen Party *</Label>
                  <Textarea
                    value={formData.setDescription}
                    onChange={(e) => setFormData({...formData, setDescription: e.target.value})}
                    className="bg-background border-ink text-ink mt-2"
                    rows={4}
                    placeholder="Je commence avec des vibes chill pour chauffer la piste, puis j'monte progressivement..."
                    required
                  />
                </div>
              </div>
            </Card>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-coral to-destructive hover:from-coral hover:to-destructive text-ink text-lg py-7"
              disabled={isProcessing}
            >
              <Send className="w-5 h-5 mr-2" />
              {isProcessing ? "Envoi..." : "Envoyer ma candidature"}
            </Button>

            <p className="text-center text-sm text-mute">
              Nous examinerons ta candidature et te contacterons sous 48h
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

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
import { Instagram, Youtube, TrendingUp, DollarSign, Users, Target, Send } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function InfluenceurCandidaturePage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    age: "",
    influenceType: "",
    primaryPlatform: "",

    // Métriques réseaux sociaux
    instagramHandle: "",
    instagramFollowers: "",
    instagramEngagement: "",

    tiktokHandle: "",
    tiktokFollowers: "",
    tiktokEngagement: "",

    youtubeChannel: "",
    youtubeSubscribers: "",
    youtubeViews: "",

    snapchatHandle: "",
    snapchatFollowers: "",

    // Détails d'activité
    contentTypes: [] as string[],
    targetAudience: "",
    averageReach: "",
    previousBrands: "",

    // Partenariats
    openToPartnerships: false,
    partnershipPreferences: "",
    rates: "",

    // Motivation
    whyTeenParty: "",
    contentIdeas: "",
    portfolioUrl: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Ici tu peux envoyer les données à Supabase
      console.log("Formulaire soumis:", formData)
      alert("Candidature envoyée ! Nous te contacterons sous 48h.")
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de l'envoi")
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleContentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type]
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black mb-4">
              Candidature <span className="text-gradient">Influenceur</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Collabore avec Teen Party et monétise ton influence auprès des 13-17 ans
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informations personnelles */}
            <Card className="p-8 bg-zinc-900 border-zinc-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-pink-500" />
                Informations personnelles
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fullName" className="text-zinc-300">Nom complet *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-zinc-300">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-zinc-300">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-zinc-300">Ville *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="age" className="text-zinc-300">Âge *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="influenceType" className="text-zinc-300">Type d'influence *</Label>
                  <Select value={formData.influenceType} onValueChange={(value) => setFormData({...formData, influenceType: value})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white mt-2">
                      <SelectValue placeholder="Sélectionne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nano">Nano (1K-10K)</SelectItem>
                      <SelectItem value="micro">Micro (10K-50K)</SelectItem>
                      <SelectItem value="mid">Mid-tier (50K-500K)</SelectItem>
                      <SelectItem value="macro">Macro (500K-1M)</SelectItem>
                      <SelectItem value="mega">Mega (1M+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Métriques réseaux sociaux */}
            <Card className="p-8 bg-zinc-900 border-zinc-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-pink-500" />
                Métriques réseaux sociaux
              </h2>

              {/* Instagram */}
              <div className="mb-8 p-6 bg-pink-500/5 border border-pink-500/20 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  Instagram
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-300">Pseudo</Label>
                    <Input
                      value={formData.instagramHandle}
                      onChange={(e) => setFormData({...formData, instagramHandle: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                      placeholder="@tonpseudo"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Abonnés</Label>
                    <Input
                      type="number"
                      value={formData.instagramFollowers}
                      onChange={(e) => setFormData({...formData, instagramFollowers: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Taux d'engagement (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.instagramEngagement}
                      onChange={(e) => setFormData({...formData, instagramEngagement: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                      placeholder="5.2"
                    />
                  </div>
                </div>
              </div>

              {/* TikTok */}
              <div className="mb-8 p-6 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  TikTok
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-300">Pseudo</Label>
                    <Input
                      value={formData.tiktokHandle}
                      onChange={(e) => setFormData({...formData, tiktokHandle: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                      placeholder="@tonpseudo"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Abonnés</Label>
                    <Input
                      type="number"
                      value={formData.tiktokFollowers}
                      onChange={(e) => setFormData({...formData, tiktokFollowers: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Taux d'engagement (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.tiktokEngagement}
                      onChange={(e) => setFormData({...formData, tiktokEngagement: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  YouTube
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-300">Chaîne</Label>
                    <Input
                      value={formData.youtubeChannel}
                      onChange={(e) => setFormData({...formData, youtubeChannel: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                      placeholder="Nom de la chaîne"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Abonnés</Label>
                    <Input
                      type="number"
                      value={formData.youtubeSubscribers}
                      onChange={(e) => setFormData({...formData, youtubeSubscribers: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Vues totales</Label>
                    <Input
                      type="number"
                      value={formData.youtubeViews}
                      onChange={(e) => setFormData({...formData, youtubeViews: e.target.value})}
                      className="bg-zinc-950 border-zinc-700 text-white mt-2"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Types de contenu */}
            <Card className="p-8 bg-zinc-900 border-zinc-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-pink-500" />
                Type d'activités et contenu
              </h2>

              <div className="mb-6">
                <Label className="text-zinc-300 mb-4 block">Types de contenu que tu crées *</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  {['Mode/Style', 'Beauté/Makeup', 'Lifestyle', 'Gaming', 'Sport/Fitness', 'Musique/Danse', 'Humour/Comedy', 'Éducation', 'Tech/Gadgets'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={type}
                        checked={formData.contentTypes.includes(type)}
                        onCheckedChange={() => toggleContentType(type)}
                      />
                      <label htmlFor={type} className="text-sm text-zinc-300 cursor-pointer">{type}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-zinc-300">Audience cible</Label>
                  <Input
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    placeholder="Ados 13-17 ans, principalement filles"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Portée moyenne par post</Label>
                  <Input
                    type="number"
                    value={formData.averageReach}
                    onChange={(e) => setFormData({...formData, averageReach: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="mt-6">
                <Label className="text-zinc-300">Marques avec qui tu as déjà collaboré</Label>
                <Textarea
                  value={formData.previousBrands}
                  onChange={(e) => setFormData({...formData, previousBrands: e.target.value})}
                  className="bg-zinc-950 border-zinc-800 text-white mt-2"
                  rows={3}
                  placeholder="Zara, Sephora, Nike..."
                />
              </div>
            </Card>

            {/* Partenariats */}
            <Card className="p-8 bg-zinc-900 border-zinc-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-500" />
                Partenariats et featuring
              </h2>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="openToPartnerships"
                    checked={formData.openToPartnerships}
                    onCheckedChange={(checked) => setFormData({...formData, openToPartnerships: checked as boolean})}
                  />
                  <label htmlFor="openToPartnerships" className="text-zinc-300 cursor-pointer">
                    Je suis ouvert(e) aux featurings avec partenaires (clubs, marques, événements)
                  </label>
                </div>

                <div>
                  <Label className="text-zinc-300">Préférences de partenariat</Label>
                  <Textarea
                    value={formData.partnershipPreferences}
                    onChange={(e) => setFormData({...formData, partnershipPreferences: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    rows={3}
                    placeholder="Je préfère travailler avec des marques éthiques, j'évite la fast-fashion..."
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Tes tarifs moyens (optionnel)</Label>
                  <Input
                    value={formData.rates}
                    onChange={(e) => setFormData({...formData, rates: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    placeholder="500 DH pour une story, 1500 DH pour un post..."
                  />
                </div>
              </div>
            </Card>

            {/* Motivation */}
            <Card className="p-8 bg-zinc-900 border-zinc-800">
              <h2 className="text-2xl font-bold mb-6">Motivation et idées</h2>

              <div className="space-y-6">
                <div>
                  <Label className="text-zinc-300">Pourquoi veux-tu collaborer avec Teen Party? *</Label>
                  <Textarea
                    value={formData.whyTeenParty}
                    onChange={(e) => setFormData({...formData, whyTeenParty: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Idées de contenu pour promouvoir Teen Party *</Label>
                  <Textarea
                    value={formData.contentIdeas}
                    onChange={(e) => setFormData({...formData, contentIdeas: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    rows={4}
                    placeholder="GRWM pour une soirée Teen Party, vlog de mon expérience, challenges avec mes abonnés..."
                    required
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Lien vers ton portfolio ou meilleur contenu</Label>
                  <Input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 text-white mt-2"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </Card>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-lg py-7"
              disabled={isProcessing}
            >
              <Send className="w-5 h-5 mr-2" />
              {isProcessing ? "Envoi..." : "Envoyer ma candidature"}
            </Button>

            <p className="text-center text-sm text-zinc-500">
              Nous examinerons ta candidature et te contacterons sous 48h
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

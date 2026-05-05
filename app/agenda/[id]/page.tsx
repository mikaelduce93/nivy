"use client"

import { useState, useEffect } from "react"
import { useParams } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, Users, Shirt, CheckCircle2, Shield, Music, Camera, Gift, ArrowRight, MapPinned, Share2, Heart, Star, Play, ChevronLeft, ChevronRight, Bus, Car, X, MessageSquare, TrendingUp, Sparkles } from 'lucide-react'
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from 'next/image'
import { VIPPricingBadge } from "@/components/features/events/vip-pricing-badge"

export default function EventDetailPage() {
  const params = useParams()
  const [event, setEvent] = useState<any>(null)
  const [similarEvents, setSimilarEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0)
  const [transportOption, setTransportOption] = useState<string>("")
  const [avisAverage, setAvisAverage] = useState(4.8)

  const galleryImages = [
    { type: 'image', url: event?.image_url || "/teens-party-event-1.jpg" },
    { type: 'image', url: "/teens-party-dance-floor.jpg" },
    { type: 'video', url: "https://www.youtube.com/embed/dQw4w9WgXcQ", thumbnail: "/teens-party-video.jpg" },
    { type: 'image', url: "/teens-party-dj.jpg" },
    { type: 'image', url: "/teens-party-crowd.jpg" },
    { type: 'image', url: "/teens-party-lights.jpg" },
  ]

  const artists = [
    { name: "DJ Shadow", role: "Main DJ", image: "/dj-avatar-1.jpg", bio: "DJ international avec 10 ans d'expérience" },
    { name: "MC Flow", role: "MC/Animateur", image: "/mc-avatar.jpg", bio: "Animateur énergique adoré des ados" },
    { name: "DJ Luna", role: "Support DJ", image: "/dj-avatar-2.jpg", bio: "Spécialiste hip-hop et électro" },
  ]

  const reviews = [
    { id: 1, author: "Sarah M.", rating: 5, date: "Il y a 2 jours", comment: "Incroyable soirée ! Mes ados ont adoré, ambiance de fou et sécurité au top. Je recommande à 100%", avatar: "/avatar-girl-1.jpg" },
    { id: 2, author: "Karim B.", rating: 5, date: "Il y a 1 semaine", comment: "Organisation parfaite, les DJs étaient exceptionnels. Mon fils n'arrête pas d'en parler !", avatar: "/avatar-boy-1.jpg" },
    { id: 3, author: "Leila A.", rating: 4, date: "Il y a 2 semaines", comment: "Très bonne expérience. Seul petit bémol : un peu d'attente au vestiaire à la fin.", avatar: "/avatar-girl-2.jpg" },
  ]

  useEffect(() => {
    loadEvent()
  }, [params.id])

  async function loadEvent() {
    const supabase = createClient()
    
    const { data } = await supabase
      .from("events")
      .select("*, city:cities(name), venue:venues(name, address)")
      .eq("id", params.id)
      .single()

    if (data) {
      setEvent(data)
      
      const { data: similar } = await supabase
        .from("events")
        .select("*, city:cities(name)")
        .eq("type", data.type)
        .neq("id", data.id)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3)
      
      if (similar) setSimilarEvents(similar)
    }
    setLoading(false)
  }

  const nextGalleryImage = () => {
    setSelectedGalleryIndex((prev) => (prev + 1) % galleryImages.length)
  }

  const prevGalleryImage = () => {
    setSelectedGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
          <Link href="/agenda">
            <Button>Retour à l'agenda</Button>
          </Link>
        </div>
      </div>
    )
  }

  const eventDate = new Date(event.event_date)
  const spotsLeft = event.capacity - (event.current_attendees || 0)
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0
  const isFull = spotsLeft <= 0

  const openGoogleMaps = () => {
    const address = encodeURIComponent(`${event.venue?.name || event.venue}, ${event.city?.name || event.city}`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank")
  }

  const shareEvent = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[60vh] min-h-[400px] pt-16">
          <Image
            src={event.image_url || "/placeholder.svg?height=600&width=1200&query=teens party event"}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="absolute top-4 right-4 z-10">
                <Camera className="w-4 h-4 mr-2" />
                Voir la galerie ({galleryImages.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[80vh] p-0">
              <div className="relative h-full">
                {galleryImages[selectedGalleryIndex].type === 'video' ? (
                  <iframe
                    title={`Vidéo de la galerie ${selectedGalleryIndex + 1}`}
                    src={galleryImages[selectedGalleryIndex].url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <Image
                    src={galleryImages[selectedGalleryIndex].url || "/placeholder.svg"}
                    alt={`Gallery ${selectedGalleryIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevGalleryImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextGalleryImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGalleryIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === selectedGalleryIndex ? 'bg-white w-8' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="absolute bottom-0 left-0 right-0 pb-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {event.has_aefe_discount && (
                  <Badge className="bg-blue-500 text-white">AEFE -20%</Badge>
                )}
                {isAlmostFull && (
                  <Badge className="bg-orange-500 text-white">Presque complet</Badge>
                )}
                {isFull && (
                  <Badge className="bg-red-500 text-white">COMPLET</Badge>
                )}
                <Badge variant="outline">{event.type}</Badge>
                {event.current_attendees > 50 && (
                  <Badge className="bg-purple-500 text-white">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Populaire
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 text-white">{event.title}</h1>
              
              <div className="flex flex-wrap gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">
                    {eventDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{event.city?.name || event.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{event.age_min}-{event.age_max} ans</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{avisAverage}/5 ({reviews.length} avis)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </Card>

              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Music className="w-6 h-6 text-primary" />
                  Artistes & DJs
                </h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {artists.map((artist, idx) => (
                    <div key={idx} className="text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-3">
                        <AvatarImage src={artist.image || "/placeholder.svg"} alt={artist.name} />
                        <AvatarFallback>{artist.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold">{artist.name}</h3>
                      <p className="text-sm text-primary mb-2">{artist.role}</p>
                      <p className="text-xs text-muted-foreground">{artist.bio}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Ce qui est inclus</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Gift, text: "Boissons à volonté" },
                    { icon: Gift, text: "Bonbons à volonté" },
                    { icon: Music, text: "DJs professionnels" },
                    { icon: Camera, text: "Animations & surprises" },
                    { icon: Shield, text: "Vestiaire gratuit" },
                    { icon: CheckCircle2, text: "Encadrement sécurisé" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    Avis ({reviews.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{avisAverage}</span>
                    <span className="text-muted-foreground">/5</span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-border last:border-0 pb-6 last:pb-0">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.author} />
                          <AvatarFallback>{review.author.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">{review.author}</p>
                              <p className="text-sm text-muted-foreground">{review.date}</p>
                            </div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full mt-6">
                  Voir tous les avis
                </Button>
              </Card>

              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Règles & Informations</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Âge requis</p>
                      <p className="text-sm text-muted-foreground">Réservé aux {event.age_min}-{event.age_max} ans. Contrôle d'identité à l'entrée.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shirt className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Dress code</p>
                      <p className="text-sm text-muted-foreground">{event.dress_code || "Tenue décontractée, soyez vous-même!"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Sécurité</p>
                      <p className="text-sm text-muted-foreground">100% sans alcool. Équipe de sécurité professionnelle sur place.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Camera className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Photos</p>
                      <p className="text-sm text-muted-foreground">Badge NO-PHOTO disponible sur demande pour ceux qui ne souhaitent pas être photographiés.</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Faut-il une autorisation parentale?</AccordionTrigger>
                    <AccordionContent>
                      Oui, une autorisation parentale est obligatoire pour tous les mineurs. Vous pourrez la remplir lors de la réservation.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Puis-je annuler ma réservation?</AccordionTrigger>
                    <AccordionContent>
                      Les annulations sont acceptées jusqu'à 48h avant l'événement pour un remboursement complet.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Comment accéder à l'événement?</AccordionTrigger>
                    <AccordionContent>
                      Après votre réservation, vous recevrez un billet électronique avec un QR code à présenter à l'entrée.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger>Y a-t-il un parking?</AccordionTrigger>
                    <AccordionContent>
                      Oui, un parking gratuit est disponible pour déposer et récupérer les participants.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="p-8">
                <div className="flex items-start gap-4">
                  <MapPinned className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Lieu</h2>
                    <p className="text-lg font-medium mb-1">{event.venue?.name || event.venue}</p>
                    <p className="text-muted-foreground mb-4">{event.venue?.address || ''} {event.city?.name || event.city}</p>
                    <Button variant="outline" onClick={openGoogleMaps}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Obtenir l'itinéraire
                    </Button>
                  </div>
                </div>
              </Card>

              {similarEvents.length > 0 && (
                <Card className="p-8">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Événements similaires
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {similarEvents.map((similar) => (
                      <Link key={similar.id} href={`/agenda/${similar.id}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                          <div className="relative h-40">
                            <Image
                              src={similar.image_url || "/placeholder.svg?height=160&width=320&query=event"}
                              alt={similar.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold mb-2 line-clamp-2">{similar.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(similar.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{similar.city?.name || similar.city}</span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-1">À partir de</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-4xl font-black text-primary">{event.price} DH</p>
                    {event.has_aefe_discount && (
                      <Badge className="bg-blue-500 text-white">-20% AEFE</Badge>
                    )}
                  </div>
                  {/* VIP Pricing Display */}
                  {event.price && event.price > 0 && (
                    <VIPPricingBadge
                      standardPrice={event.price}
                      vipPrice={event.price_vip}
                      premiumPrice={event.price_premium}
                      variant="card"
                      showVIPLink={true}
                    />
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Places restantes</span>
                    <span className="font-bold">{String(spotsLeft)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Capacité totale</span>
                    <span className="font-bold">{String(event.capacity || 0)}</span>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="mb-6">
                  <Label className="text-base font-semibold mb-3 block">Options transport</Label>
                  <RadioGroup value={transportOption} onValueChange={setTransportOption}>
                    <div className="flex items-center space-x-2 mb-3 p-3 border rounded-lg hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Je me déplace seul(e)</span>
                        </div>
                      </Label>
                      <span className="text-sm font-medium">Gratuit</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-3 p-3 border rounded-lg hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="shuttle" id="shuttle" />
                      <Label htmlFor="shuttle" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4" />
                          <span>Navette aller-retour</span>
                        </div>
                      </Label>
                      <span className="text-sm font-medium">+50 DH</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary cursor-pointer">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          <span>Transport privé</span>
                        </div>
                      </Label>
                      <span className="text-sm font-medium">+150 DH</span>
                    </div>
                  </RadioGroup>
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <Button asChild className="w-full" size="lg" disabled={isFull}>
                    <Link href={`/reservation?event=${event.id}${transportOption ? `&transport=${transportOption}` : ''}`}>
                      {isFull ? "Complet" : "Réserver maintenant"}
                      {!isFull && <ArrowRight className="w-5 h-5 ml-2" />}
                    </Link>
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className="w-full"
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                      Favoris
                    </Button>
                    <Button variant="outline" onClick={shareEvent} className="w-full">
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    Paiement sécurisé • Annulation gratuite 48h avant
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="fixed bottom-24 md:bottom-6 right-6 lg:hidden z-50">
          <Button asChild size="lg" className="rounded-full shadow-lg" disabled={isFull}>
            <Link href={`/reservation?event=${event.id}${transportOption ? `&transport=${transportOption}` : ''}`}>
              {isFull ? "Complet" : "Réserver"}
              {!isFull && <ArrowRight className="w-5 h-5 ml-2" />}
            </Link>
          </Button>
        </div>
    </div>
  )
}

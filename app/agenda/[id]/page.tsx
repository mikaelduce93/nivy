"use client"

import { useState, useEffect } from "react"
import { useParams } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Calendar, MapPin, Clock, Users, Shirt, Check, Shield, Music, Gift, ArrowRight, MapPinned, Share2, Bus, Car, TrendingUp, Sparkles } from 'lucide-react'
import Link from "next/link"
import Image from 'next/image'
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { NivCoach, DarkSurface } from "@/components/brand"
import { VIPPricingBadge } from "@/components/features/events/vip-pricing-badge"

const INCLUDED = [
  { icon: Gift, text: "Boissons à volonté" },
  { icon: Gift, text: "Bonbons à volonté" },
  { icon: Music, text: "DJs professionnels" },
  { icon: Sparkles, text: "Animations & surprises" },
  { icon: Shield, text: "Vestiaire gratuit" },
  { icon: Check, text: "Encadrement sécurisé" },
]

export default function EventDetailPage() {
  const params = useParams()
  const [event, setEvent] = useState<any>(null)
  const [similarEvents, setSimilarEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [transportOption, setTransportOption] = useState<string>("")

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper pt-24">
        <div className="size-12 animate-spin rounded-full border-b-2 border-ink" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper pt-24">
        <div className="text-center">
          <h2 className="mb-4 font-display text-2xl font-bold">Événement introuvable</h2>
          <Button asChild variant="pink">
            <Link href="/agenda">Retour à l'agenda</Link>
          </Button>
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
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href,
        })
      } catch {
        /* user cancelled the native share sheet — expected, no-op */
      }
      return
    }
    // Desktop fallback (no Web Share API): copy the link + honest toast.
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Lien copié dans le presse-papier")
    } catch {
      toast.error("Impossible de copier le lien")
    }
  }

  const badge = (cls: string, children: React.ReactNode) => (
    <span className={`flex w-fit items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink ${cls}`}>
      {children}
    </span>
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero image */}
      <div className="relative h-[56vh] min-h-[380px] pt-16">
        <Image
          src={event.image_url || "/placeholder.svg?height=600&width=1200&query=soiree nivy"}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 pb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {event.has_aefe_discount && badge("bg-teal", "AEFE -20%")}
              {isAlmostFull && badge("bg-coral", "Presque complet")}
              {isFull && badge("bg-destructive text-paper", "Complet")}
              {badge("bg-white", event.type)}
              {event.current_attendees > 50 && badge("bg-pink", <><TrendingUp className="size-3" aria-hidden="true" />Populaire</>)}
            </div>

            <h1 className="mb-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>

            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-ink-2">
              <span className="flex items-center gap-2">
                <Calendar className="size-5 text-pink" aria-hidden="true" />
                {eventDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-5 text-pink" aria-hidden="true" />
                {eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-5 text-pink" aria-hidden="true" />
                {event.city?.name || event.city}
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-5 text-pink" aria-hidden="true" />
                {event.age_min}-{event.age_max} ans
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <StickerCard className="gap-3 p-8">
              <p className="eyebrow tracking-[0.16em]">L'événement</p>
              <h2 className="font-display text-2xl font-extrabold">Description</h2>
              <p className="leading-relaxed text-ink-2">{event.description}</p>
            </StickerCard>

            {/* Ce qui est inclus */}
            <StickerCard className="gap-4 p-8">
              <p className="eyebrow tracking-[0.16em]">Inclus</p>
              <h2 className="font-display text-2xl font-extrabold">Ce qui est inclus</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lime">
                      <item.icon className="size-5 text-ink" aria-hidden="true" />
                    </span>
                    <span className="font-medium text-ink">{item.text}</span>
                  </div>
                ))}
              </div>
            </StickerCard>

            {/* Règles & sécurité — avec Niv coach */}
            <StickerCard className="gap-5 p-8">
              <p className="eyebrow tracking-[0.16em]">À savoir</p>
              <h2 className="font-display text-2xl font-extrabold">Règles & informations</h2>
              <NivCoach
                mood="calm"
                message="Soirée 100% sans alcool, équipe de sécurité pro sur place, contrôle d'identité à l'entrée. T'es entre de bonnes mains."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <RuleRow icon={Users} title="Âge requis">
                  Réservé aux {event.age_min}-{event.age_max} ans. Contrôle d'identité à l'entrée.
                </RuleRow>
                <RuleRow icon={Shirt} title="Dress code">
                  {event.dress_code || "Tenue décontractée, sois toi-même !"}
                </RuleRow>
                <RuleRow icon={Shield} title="Sécurité">
                  100% sans alcool. Équipe de sécurité professionnelle sur place.
                </RuleRow>
                <RuleRow icon={Sparkles} title="Photos">
                  Badge NO-PHOTO disponible sur demande si tu ne veux pas être pris en photo.
                </RuleRow>
              </div>
            </StickerCard>

            {/* FAQ */}
            <StickerCard className="gap-4 p-8">
              <p className="eyebrow tracking-[0.16em]">FAQ</p>
              <h2 className="font-display text-2xl font-extrabold">Questions fréquentes</h2>
              <Accordion type="single" collapsible className="space-y-3">
                <FaqItem value="item-1" q="Faut-il une autorisation parentale ?">
                  Oui, une autorisation parentale est obligatoire pour tous les mineurs. Tu pourras la remplir lors de la réservation.
                </FaqItem>
                <FaqItem value="item-2" q="Puis-je annuler ma réservation ?">
                  Les annulations sont acceptées jusqu'à 48h avant l'événement pour un remboursement complet.
                </FaqItem>
                <FaqItem value="item-3" q="Comment accéder à l'événement ?">
                  Après ta réservation, tu reçois un billet électronique avec un QR code à présenter à l'entrée.
                </FaqItem>
                <FaqItem value="item-4" q="Y a-t-il un parking ?">
                  Oui, un parking gratuit est disponible pour déposer et récupérer les participants.
                </FaqItem>
              </Accordion>
            </StickerCard>

            {/* Lieu */}
            <StickerCard className="p-8">
              <div className="flex items-start gap-4">
                <MapPinned className="size-8 shrink-0 text-pink" aria-hidden="true" />
                <div className="flex-1">
                  <p className="eyebrow tracking-[0.16em]">Lieu</p>
                  <p className="mt-1 font-display text-lg font-bold">{event.venue?.name || event.venue}</p>
                  <p className="mb-4 text-mute">{event.venue?.address || ''} {event.city?.name || event.city}</p>
                  <Button variant="outline" onClick={openGoogleMaps}>
                    <MapPin className="mr-2 size-4" aria-hidden="true" />
                    Obtenir l'itinéraire
                  </Button>
                </div>
              </div>
            </StickerCard>

            {/* Similaires */}
            {similarEvents.length > 0 && (
              <StickerCard className="gap-5 p-8">
                <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
                  <Sparkles className="size-6 text-pink" aria-hidden="true" />
                  Événements similaires
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {similarEvents.map((similar) => (
                    <Link key={similar.id} href={`/agenda/${similar.id}`}>
                      <StickerCard variant="hover" className="overflow-hidden p-0">
                        <div className="relative h-40 border-b-2 border-ink">
                          <Image
                            src={similar.image_url || "/placeholder.svg?height=160&width=320&query=soiree nivy"}
                            alt={similar.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="mb-2 line-clamp-2 font-display font-bold">{similar.title}</h3>
                          <div className="space-y-1 font-mono text-xs text-mute">
                            <span className="flex items-center gap-2">
                              <Calendar className="size-4" aria-hidden="true" />
                              {new Date(similar.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                            <span className="flex items-center gap-2">
                              <MapPin className="size-4" aria-hidden="true" />
                              {similar.city?.name || similar.city}
                            </span>
                          </div>
                        </div>
                      </StickerCard>
                    </Link>
                  ))}
                </div>
              </StickerCard>
            )}
          </div>

          {/* Pricing column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <DarkSurface tone="pink" shadow className="p-6">
                <p className="eyebrow tracking-[0.16em] text-paper/60">À partir de</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-display text-4xl font-extrabold tabular-nums text-paper">{event.price} DH</p>
                  {event.has_aefe_discount && (
                    <span className="rounded-full border-2 border-paper/40 px-2 py-0.5 font-mono text-[10px] font-bold text-paper">-20% AEFE</span>
                  )}
                </div>
              </DarkSurface>

              <StickerCard className="gap-5 p-6">
                {event.price && event.price > 0 && (
                  <VIPPricingBadge
                    standardPrice={event.price}
                    vipPrice={event.price_vip}
                    premiumPrice={event.price_premium}
                    variant="card"
                    showVIPLink={true}
                  />
                )}

                <div className="space-y-1 font-mono text-sm">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-line py-2">
                    <span className="text-mute">Places restantes</span>
                    <span className="font-bold text-ink">{String(spotsLeft)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-mute">Capacité totale</span>
                    <span className="font-bold text-ink">{String(event.capacity || 0)}</span>
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                    Options transport
                  </Label>
                  <RadioGroup value={transportOption} onValueChange={setTransportOption} className="space-y-2">
                    <TransportOption value="none" id="none" icon={Users} label="Je me déplace seul(e)" price="Gratuit" />
                    <TransportOption value="shuttle" id="shuttle" icon={Bus} label="Navette aller-retour" price="+50 DH" />
                    <TransportOption value="private" id="private" icon={Car} label="Transport privé" price="+150 DH" />
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Button asChild variant="pink" className="w-full" size="lg" disabled={isFull}>
                    <Link href={`/reservation?event=${event.id}${transportOption ? `&transport=${transportOption}` : ''}`}>
                      {isFull ? "Complet" : "Réserver maintenant"}
                      {!isFull && <ArrowRight className="ml-2 size-5" aria-hidden="true" />}
                    </Link>
                  </Button>

                  <Button variant="outline" onClick={shareEvent} className="w-full">
                    <Share2 className="mr-2 size-4" aria-hidden="true" />
                    Partager
                  </Button>
                </div>

                <p className="rounded-xl border-2 border-line bg-paper-2 p-3 text-center font-mono text-xs text-mute">
                  Paiement sécurisé • Annulation gratuite 48h avant
                </p>
              </StickerCard>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky booking */}
      <div className="fixed bottom-24 right-6 z-50 md:bottom-6 lg:hidden">
        <Button asChild size="lg" variant="pink" className="rounded-full shadow-stkr-md" disabled={isFull}>
          <Link href={`/reservation?event=${event.id}${transportOption ? `&transport=${transportOption}` : ''}`}>
            {isFull ? "Complet" : "Réserver"}
            {!isFull && <ArrowRight className="ml-2 size-5" aria-hidden="true" />}
          </Link>
        </Button>
      </div>
    </div>
  )
}

function RuleRow({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-1 size-5 shrink-0 text-teal" aria-hidden="true" />
      <div>
        <p className="font-display font-bold">{title}</p>
        <p className="text-sm text-mute">{children}</p>
      </div>
    </div>
  )
}

function FaqItem({ value, q, children }: { value: string; q: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="rounded-xl border-2 border-ink bg-white px-5 shadow-stkr-sm">
      <AccordionTrigger className="font-display font-bold hover:no-underline">{q}</AccordionTrigger>
      <AccordionContent className="text-mute">{children}</AccordionContent>
    </AccordionItem>
  )
}

function TransportOption({ value, id, icon: Icon, label, price }: { value: string; id: string; icon: typeof Bus; label: string; price: string }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line p-3 transition-colors has-[[data-state=checked]]:border-ink"
    >
      <RadioGroupItem value={value} id={id} />
      <span className="flex flex-1 items-center gap-2 text-sm font-medium text-ink">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-ink">{price}</span>
    </label>
  )
}

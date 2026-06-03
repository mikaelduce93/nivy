import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Clock, CreditCard } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PaymentCartResumeBanner } from "@/components/payment-cart-resume-banner"
import { ReservationStepper } from "@/components/reservation-stepper"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivCoach } from "@/components/brand"

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ event: string; type?: string }>
}) {
  const { event: eventId, type: ticketType } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirect=/reservation?event=${eventId}&type=${ticketType || "standard"}`)
  }

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single()

  // #28 — no `children` table; linked teens live in teens via parent_teen_links.
  const { data: teenLinks } = await supabase
    .from("parent_teen_links")
    .select("teen_id")
    .eq("parent_id", user.id)
    .eq("status", "active")
  const linkedTeenIds = (teenLinks ?? []).map((l: any) => l.teen_id)
  const { data: children } = linkedTeenIds.length
    ? await supabase
        .from("teens")
        .select("id, first_name, last_name, date_of_birth")
        .in("id", linkedTeenIds)
    : { data: [] as any[] }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!event) {
    redirect("/agenda")
  }

  const selectedType = ticketType || "standard"
  const isAEFE = profile?.school_type === 'aefe' || profile?.is_aefe === true
  const basePrice = selectedType === "vip" ? event.vip_price : event.base_price
  const price = isAEFE ? basePrice * 0.9 : basePrice // 10% discount for AEFE

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-5xl mx-auto">
          <PaymentCartResumeBanner />
          <ReservationStepper step={0} />

          <p className="eyebrow tracking-[0.16em] text-mute">Réservation</p>
          <h1 className="mt-2 mb-8 font-display text-4xl md:text-6xl font-extrabold tracking-tight text-ink">
            Finaliser la <em className="font-semibold italic text-pink">réservation</em>
          </h1>

          <form action={`/api/bookings/create`} method="POST" className="grid lg:grid-cols-2 gap-12">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="ticketType" value={selectedType} />
            <input type="hidden" name="price" value={price || 0} />

            <div className="space-y-8">
              <StickerCard className="p-8">
                <p className="eyebrow tracking-[0.16em] text-mute">Détails de l'événement</p>
                <h2 className="mt-2 mb-6 font-display text-2xl font-extrabold text-ink">{event.title}</h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-mute text-sm">
                      <Calendar className="w-4 h-4 text-teal" />
                      <span>
                        {new Date(event.event_date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-mute text-sm mt-2">
                      <Clock className="w-4 h-4 text-teal" />
                      <span>{event.event_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-mute text-sm mt-2">
                      <MapPin className="w-4 h-4 text-teal" />
                      <span>
                        {event.venue_name}, {event.city}
                      </span>
                    </div>
                  </div>
                </div>
              </StickerCard>

              <StickerCard className="p-8">
                <p className="eyebrow tracking-[0.16em] text-mute">Attribution du billet</p>
                <h2 className="mt-2 mb-6 font-display text-2xl font-extrabold text-ink">À qui est ce billet ?</h2>

                {(!children || children.length === 0) && (
                  <div className="rounded-xl border-2 border-ink bg-gold/15 p-4 mb-6">
                    <p className="text-ink text-sm mb-3">
                      Ajoute au moins un ado à ton profil pour finaliser cette réservation.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      asChild
                      variant="pink"
                    >
                      <Link href="/parent/teens/add">Ajouter un ado</Link>
                    </Button>
                  </div>
                )}

                {children && children.length > 0 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 border-ink p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-ink font-semibold">Billet {selectedType === "vip" ? "VIP" : "Standard"}</p>
                        <div className="text-right">
                          {isAEFE && (
                            <p className="font-mono text-xs text-lime line-through tabular-nums">{basePrice} DH</p>
                          )}
                          <p className="font-mono text-base font-bold text-ink tabular-nums">{price} DH</p>
                          {isAEFE && (
                            <p className="font-mono text-xs text-lime">-10% AEFE</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="childId" className="text-mute text-sm mb-2 block">
                          Assigner à :
                        </Label>
                        <Select name="childId" required>
                          <SelectTrigger id="childId" className="border-2 border-ink text-ink">
                            <SelectValue placeholder="Sélectionner un ado" />
                          </SelectTrigger>
                          <SelectContent>
                            {children.map((child: any) => {
                              const age = Math.floor(
                                (new Date().getTime() - new Date(child.date_of_birth).getTime()) /
                                  (1000 * 60 * 60 * 24 * 365),
                              )
                              const isEligible = age >= 11 && age <= 17
                              return (
                                <SelectItem key={child.id} value={child.id} disabled={!isEligible}>
                                  {child.first_name} {child.last_name} ({age} ans)
                                  {!isEligible && " - Âge non éligible"}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-mute mt-2">
                          Événements réservés aux 11-17 ans uniquement
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </StickerCard>

              <StickerCard className="p-8">
                <p className="eyebrow tracking-[0.16em] text-mute">Informations parent</p>
                <h2 className="mt-2 mb-6 font-display text-2xl font-extrabold text-ink">Tes coordonnées</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mute">Nom</span>
                    <span className="text-ink font-semibold">
                      {profile?.prenom} {profile?.nom}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Email</span>
                    <span className="text-ink font-semibold">{profile?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Téléphone</span>
                    <span className="text-ink font-semibold">{profile?.telephone}</span>
                  </div>
                </div>
              </StickerCard>

              <div className="flex items-start gap-3 p-6 rounded-2xl border-2 border-ink bg-white">
                <Checkbox id="cgv" name="acceptCGV" required className="mt-1" />
                <Label htmlFor="cgv" className="text-sm text-ink-2 cursor-pointer">
                  J'accepte les{" "}
                  <Link href="/legal/cgv" className="text-pink hover:underline" target="_blank">
                    Conditions Générales de Vente
                  </Link>{" "}
                  et confirme avoir pris connaissance de la{" "}
                  <Link href="/securite" className="text-pink hover:underline" target="_blank">
                    Politique de Sécurité
                  </Link>
                </Label>
              </div>
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start space-y-6">
              <StatHero
                eyebrow="Total à régler"
                value={price}
                unit="DH"
                tone="teal"
              />

              <StickerCard className="p-8">
                <p className="eyebrow tracking-[0.16em] text-mute">Récapitulatif</p>

                <div className="mt-4 space-y-4 mb-6 pb-6 border-b-2 border-ink">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ink font-semibold">Billet {selectedType === "vip" ? "VIP" : "Standard"}</p>
                      <p className="text-sm text-mute">x1</p>
                    </div>
                    <p className="font-mono font-bold text-ink tabular-nums">{isAEFE ? basePrice : price} DH</p>
                  </div>
                  {isAEFE && (
                    <div className="flex items-center justify-between">
                      <p className="text-lime text-sm">Réduction AEFE (-10%)</p>
                      <p className="font-mono font-bold text-lime tabular-nums">-{(basePrice * 0.1).toFixed(0)} DH</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-8">
                  <p className="text-xl font-bold text-ink">Total</p>
                  <p className="font-mono text-2xl font-bold text-ink tabular-nums">{price} DH</p>
                </div>

                <Button
                  type="submit"
                  variant="pink"
                  className="w-full text-lg py-6"
                  disabled={!children || children.length === 0}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Procéder au paiement
                </Button>

                <p className="text-center text-xs text-mute mt-4">
                  Paiement sécurisé — tes billets arrivent par email
                </p>

                <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t-2 border-ink">
                  <span className="rounded-full border-2 border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">SSL</span>
                  <span className="rounded-full border-2 border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">Stripe</span>
                  <span className="rounded-full border-2 border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">PCI DSS</span>
                </div>
              </StickerCard>

              <NivCoach
                mood="calm"
                message="Paiement sécurisé, wlah aucun souci. Tes infos bancaires ne sont jamais stockées."
              />
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

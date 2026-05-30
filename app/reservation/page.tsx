import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Clock, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PaymentCartResumeBanner } from "@/components/payment-cart-resume-banner"

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-5xl mx-auto">
          <PaymentCartResumeBanner />
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal to-teal text-ink flex items-center justify-center font-bold shadow-lg shadow-teal/50">
                  1
                </div>
                <span className="hidden md:inline font-semibold text-foreground">Détails</span>
              </div>
              <div className="flex-1 h-0.5 bg-muted max-w-24" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <span className="hidden md:inline text-muted-foreground">Paiement</span>
              </div>
              <div className="flex-1 h-0.5 bg-muted max-w-24" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <span className="hidden md:inline text-muted-foreground">Confirmation</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-8">Finaliser la réservation</h1>

          <form action={`/api/bookings/create`} method="POST" className="grid lg:grid-cols-2 gap-12">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="ticketType" value={selectedType} />
            <input type="hidden" name="price" value={price || 0} />

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <h2 className="text-2xl font-bold text-ink mb-6">Détails de l'événement</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-ink mb-2">{event.title}</h3>
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
              </div>

              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <h2 className="text-2xl font-bold text-ink mb-6">Attribution du billet</h2>

                {(!children || children.length === 0) && (
                  <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6">
                    <p className="text-gold text-sm mb-3">
                      Vous devez ajouter au moins un enfant dans votre profil pour compléter cette réservation.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      asChild
                      className="bg-gold hover:bg-gold text-ink border-0"
                    >
                      <Link href="/parent/teens/add">Ajouter un enfant</Link>
                    </Button>
                  </div>
                )}

                {children && children.length > 0 && (
                  <div className="space-y-4">
                    <div className="border border-ink rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-ink font-semibold">Billet {selectedType === "vip" ? "VIP" : "Standard"}</p>
                        <div className="text-right">
                          {isAEFE && (
                            <p className="text-xs text-lime line-through">{basePrice} DH</p>
                          )}
                          <p className="text-teal font-bold">{price} DH</p>
                          {isAEFE && (
                            <p className="text-xs text-lime">-10% AEFE</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="childId" className="text-mute text-sm mb-2 block">
                          Assigner à:
                        </Label>
                        <Select name="childId" required>
                          <SelectTrigger id="childId" className="bg-card border-ink text-ink">
                            <SelectValue placeholder="Sélectionner un enfant" />
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
              </div>

              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <h2 className="text-2xl font-bold text-ink mb-6">Informations parent</h2>
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
              </div>

              <div className="flex items-start gap-3 p-6 bg-card rounded-2xl border border-ink">
                <Checkbox id="cgv" name="acceptCGV" required className="mt-1" />
                <Label htmlFor="cgv" className="text-sm text-ink-2 cursor-pointer">
                  J'accepte les{" "}
                  <Link href="/cgv" className="text-teal hover:underline" target="_blank">
                    Conditions Générales de Vente
                  </Link>{" "}
                  et confirme avoir pris connaissance de la{" "}
                  <Link href="/securite" className="text-teal hover:underline" target="_blank">
                    Politique de Sécurité
                  </Link>
                </Label>
              </div>
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-75" />
                <div className="relative bg-background rounded-2xl p-8 border border-ink">
                  <h2 className="text-2xl font-bold text-ink mb-6">Récapitulatif</h2>

                  <div className="space-y-4 mb-6 pb-6 border-b border-ink">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-ink font-semibold">Billet {selectedType === "vip" ? "VIP" : "Standard"}</p>
                        <p className="text-sm text-mute">x1</p>
                      </div>
                      <p className="text-ink font-bold">{isAEFE ? basePrice : price} DH</p>
                    </div>
                    {isAEFE && (
                      <div className="flex items-center justify-between">
                        <p className="text-lime text-sm">Réduction AEFE (-10%)</p>
                        <p className="text-lime font-bold">-{(basePrice * 0.1).toFixed(0)} DH</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <p className="text-xl font-bold text-ink">Total</p>
                    <p className="text-3xl font-black text-teal">{price} DH</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0 text-lg py-6"
                    disabled={!children || children.length === 0}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Procéder au paiement
                  </Button>

                  <p className="text-center text-xs text-mute mt-4">
                    Paiement sécurisé - Vos billets seront envoyés par email
                  </p>

                  <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-ink">
                    <div className="text-xs text-mute">🔒 SSL</div>
                    <div className="text-xs text-mute">💳 Stripe</div>
                    <div className="text-xs text-mute">✓ PCI DSS</div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

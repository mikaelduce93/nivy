"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { Calendar } from "@/components/ui/calendar"
import { NivCoach, NivCelebration, DarkSurface } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"
import { Gift, CheckCircle2, Users, Music, Camera, Sparkles, ArrowRight, Crown, CalendarIcon, ChevronRight, Minus, Plus, Loader2, QrCode } from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getAnnivPacks, getAnnivExtras, calculateAnnivPrice, createAnnivOrder } from "@/features/anniversaires"
import { getMyTeens } from "@/features/teens"

type Step = 1 | 2 | 3 | 4 | 5 | 6

export default function AnniversairesPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [orderCreated, setOrderCreated] = useState<any>(null)

  // Data from APIs
  const [packs, setPacks] = useState<any[]>([])
  const [extras, setExtras] = useState<any[]>([])
  const [teens, setTeens] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Step 1: Date & Guests
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [guestCount, setGuestCount] = useState(10)
  const [selectedTeenId, setSelectedTeenId] = useState<string>("")

  // Step 2: Formula
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)

  // Step 3: Extras
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([])

  // Step 4: Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    childName: "",
    childAge: "",
    parentName: "",
    email: "",
    phone: "",
    notes: ""
  })

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      try {
        const [packsResult, extrasResult, teensResult] = await Promise.all([
          getAnnivPacks('event'),
          getAnnivExtras(),
          getMyTeens()
        ])

        if (packsResult.success && packsResult.data) {
          setPacks(packsResult.data)
        } else {
          toast.error("Impossible de charger les formules")
        }

        if (extrasResult.success && extrasResult.data) {
          setExtras(extrasResult.data)
        } else {
          toast.error("Impossible de charger les extras")
        }

        if (teensResult.success && teensResult.data) {
          setTeens(teensResult.data)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error("Chargement raté. On retente ?")
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  const selectedPack = packs.find(p => p.id === selectedPackId)

  const calculateTotal = async () => {
    if (!selectedPackId) return 0

    try {
      const result = await calculateAnnivPrice({
        pack_id: selectedPackId,
        guest_count: guestCount,
        selected_extras: selectedExtraIds
      })

      if (result.success && result.data) {
        return result.data.total_price
      }
    } catch (error) {
      console.error('Error calculating price:', error)
    }

    return 0
  }

  const [totalPrice, setTotalPrice] = useState(0)

  // Recalculate price when selections change
  useEffect(() => {
    if (selectedPackId) {
      calculateTotal().then(setTotalPrice)
    }
  }, [selectedPackId, guestCount, selectedExtraIds])

  const steps = [
    { number: 1, title: "Date & Invités" },
    { number: 2, title: "Formule" },
    { number: 3, title: "Options Extras" },
    { number: 4, title: "Infos Perso" },
    { number: 5, title: "Récapitulatif" },
  ]

  const canProceed = () => {
    if (currentStep === 1) return selectedDate && guestCount > 0
    if (currentStep === 2) return selectedPackId !== null
    if (currentStep === 4) return personalInfo.childName && personalInfo.parentName && personalInfo.email && personalInfo.phone
    return true
  }

  const handlePayment = async () => {
    if (!selectedPackId || !selectedDate) {
      toast.error("Données manquantes")
      return
    }

    setLoading(true)

    try {
      const orderData = {
        teen_id: selectedTeenId || '',
        pack_id: selectedPackId,
        order_type: 'event' as const,
        celebration_date: selectedDate.toISOString().split('T')[0],
        guest_count: guestCount,
        selected_extras: selectedExtraIds,
        notes: personalInfo.notes || undefined,
        contact_name: personalInfo.parentName,
        contact_email: personalInfo.email,
        contact_phone: personalInfo.phone,
      }

      const result = await createAnnivOrder(orderData)

      if (result.success === false) {
        toast.error(result.error)
        return
      }

      toast.success("Commande créée avec succès !")
      setOrderCreated(result.data)
      setCurrentStep(6) // Go to confirmation step
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error("Commande ratée. Réessaye ?")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-ink" aria-hidden="true" />
          <p className="text-mute">Chargement des formules…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero éditorial */}
      <section className="pt-24">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow tracking-[0.16em] text-pink">Configurateur anniv</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Configure ton anniversaire <em className="font-semibold italic text-pink">de rêve</em>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-mute">
              Personnalise chaque détail en 5 étapes simples.
            </p>
            <NivCoach
              className="mx-auto mt-8 max-w-lg text-left"
              message="On organise la soirée la plus folle de Casa. Suis-moi, je te guide étape par étape !"
            />
          </div>
        </div>
      </section>

      {/* Stepper */}
      {currentStep < 6 && (
        <section className="sticky top-16 z-40 border-b-2 border-ink bg-paper py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-pink">
                  {steps[currentStep - 1]?.title}
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-mute">
                  {String(currentStep).padStart(2, '0')} / {steps.length}
                </span>
              </div>
              <SegmentedProgress steps={steps.length} current={currentStep - 1} size="md" />
            </div>
          </div>
        </section>
      )}

      {/* Step Content */}
      <section className="py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

          {/* Step 1: Date & Guests */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-extrabold">Quand veux-tu faire la fête ?</h2>
                <p className="mt-2 text-mute">Choisis une date et le nombre d'invités</p>
              </div>

              <StickerCard className="p-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-4 tracking-[0.16em]">Sélectionne la date</p>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="mx-auto rounded-xl border-2 border-ink"
                    />
                  </div>

                  <div className="space-y-6">
                    {teens.length > 0 && (
                      <SelectSticker
                        label="Pour quel enfant ? (optionnel)"
                        placeholder="Sélectionner un enfant"
                        value={selectedTeenId}
                        onValueChange={setSelectedTeenId}
                      >
                        {teens.map((teen: any) => (
                          <SelectStickerItem key={teen.id} value={teen.id}>
                            {teen.pseudo || `${teen.first_name} ${teen.last_name}`}
                          </SelectStickerItem>
                        ))}
                      </SelectSticker>
                    )}

                    <div>
                      <p className="eyebrow mb-4 tracking-[0.16em]">Nombre d'invités</p>
                      <div className="flex items-center gap-4 rounded-xl border-2 border-ink bg-paper-2 p-4">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                          aria-label="Retirer un invité"
                        >
                          <Minus className="size-4" aria-hidden="true" />
                        </Button>
                        <div className="flex-1 text-center" aria-live="polite">
                          <div className="font-display text-4xl font-extrabold tabular-nums">{guestCount}</div>
                          <div className="text-sm text-mute">invités</div>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setGuestCount(guestCount + 1)}
                          aria-label="Ajouter un invité"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {selectedDate && (
                      <DarkSurface tone="pink" shadow className="p-6">
                        <div className="flex items-start gap-3">
                          <CalendarIcon className="mt-1 size-5 text-pink" aria-hidden="true" />
                          <div>
                            <p className="eyebrow tracking-[0.16em] text-paper/60">Date sélectionnée</p>
                            <p className="mt-1 font-display text-xl font-extrabold text-paper">
                              {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </DarkSurface>
                    )}
                  </div>
                </div>
              </StickerCard>
            </div>
          )}

          {/* Step 2: Formula */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-extrabold">Choisis ta formule</h2>
                <p className="mt-2 text-mute">Packs pour anniversaire pendant nos events</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {packs.map((pack) => {
                  const isActive = selectedPackId === pack.id
                  return (
                    <StickerCard
                      key={pack.id}
                      variant="hover"
                      onClick={() => setSelectedPackId(pack.id)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedPackId(pack.id)
                        }
                      }}
                      className={cn(
                        "overflow-hidden",
                        isActive &&
                          "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink",
                      )}
                    >
                      <div className="relative h-48 border-b-2 border-ink bg-pink/10">
                        {pack.image_url && (
                          <Image
                            src={pack.image_url}
                            alt={pack.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 33vw"
                          />
                        )}
                        {isActive && (
                          <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border-2 border-ink bg-lime text-ink">
                            <CheckCircle2 className="size-5" aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      <div className="p-6">
                        <h3 className="font-display text-xl font-extrabold">{pack.name}</h3>
                        {pack.description && (
                          <p className={cn("mt-2 text-sm", isActive ? "text-paper/70" : "text-mute")}>{pack.description}</p>
                        )}
                        <p className="mt-4 font-display text-3xl font-extrabold tabular-nums text-pink">{pack.base_price} DH</p>
                        <p className={cn("mt-2 font-mono text-xs font-bold uppercase tracking-[0.14em]", isActive ? "text-paper/60" : "text-mute")}>
                          Inclus {pack.included_guests} invités
                        </p>
                        {pack.features && Array.isArray(pack.features) && pack.features.length > 0 && (
                          <ul className="mt-4 space-y-2">
                            {pack.features.map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", isActive ? "text-lime" : "text-pink")} aria-hidden="true" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </StickerCard>
                  )
                })}
              </div>

              {packs.length === 0 && (
                <StickerCard className="items-center p-12 text-center">
                  <Gift className="mx-auto mb-4 size-16 text-mute" aria-hidden="true" />
                  <p className="text-mute">Aucune formule disponible pour le moment</p>
                </StickerCard>
              )}
            </div>
          )}

          {/* Step 3: Extras */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-extrabold">Options supplémentaires</h2>
                <p className="mt-2 text-mute">Ajoute des extras pour rendre ta fête encore plus exceptionnelle (optionnel)</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {extras.map((extra) => {
                  const isActive = selectedExtraIds.includes(extra.id)
                  const IconComponent = extra.category === 'entertainment' ? Music :
                                       extra.category === 'photo_video' ? Camera :
                                       extra.category === 'decor' ? Sparkles :
                                       extra.category === 'transport' ? Crown : Gift

                  return (
                    <StickerCard
                      key={extra.id}
                      variant="hover"
                      onClick={() => {
                        setSelectedExtraIds(prev =>
                          prev.includes(extra.id)
                            ? prev.filter(id => id !== extra.id)
                            : [...prev, extra.id]
                        )
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedExtraIds(prev =>
                            prev.includes(extra.id)
                              ? prev.filter(id => id !== extra.id)
                              : [...prev, extra.id]
                          )
                        }
                      }}
                      className={cn(
                        "p-6",
                        isActive &&
                          "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink",
                      )}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <span className={cn(
                          "grid size-12 place-items-center rounded-xl border-2 border-ink",
                          isActive ? "bg-paper text-ink" : "bg-paper-2 text-pink",
                        )}>
                          <IconComponent className="size-6" aria-hidden="true" />
                        </span>
                        {isActive && (
                          <span className="grid size-6 place-items-center rounded-full border-2 border-ink bg-lime text-[11px] font-extrabold text-ink">
                            ✓
                          </span>
                        )}
                      </div>
                      <h4 className="font-display font-bold">{extra.name}</h4>
                      {extra.description && (
                        <p className={cn("mt-2 text-sm", isActive ? "text-paper/70" : "text-mute")}>{extra.description}</p>
                      )}
                      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums text-pink">+{extra.price} DH</p>
                    </StickerCard>
                  )
                })}
              </div>

              {extras.length === 0 && (
                <StickerCard className="items-center p-12 text-center">
                  <Sparkles className="mx-auto mb-4 size-16 text-mute" aria-hidden="true" />
                  <p className="text-mute">Aucun extra disponible pour le moment</p>
                  <Button
                    className="mt-4"
                    variant="pink"
                    onClick={() => setCurrentStep(4)}
                  >
                    Passer cette étape
                  </Button>
                </StickerCard>
              )}
            </div>
          )}

          {/* Step 4: Personal Info */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-extrabold">Informations personnelles</h2>
                <p className="mt-2 text-mute">Quelques infos pour finaliser ta réservation</p>
              </div>

              <StickerCard className="p-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FieldInput
                    label="Prénom de l'enfant *"
                    id="childName"
                    placeholder="Prénom"
                    value={personalInfo.childName}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, childName: e.target.value }))}
                  />
                  <FieldInput
                    label="Âge de l'enfant *"
                    id="childAge"
                    type="number"
                    placeholder="Âge"
                    value={personalInfo.childAge}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, childAge: e.target.value }))}
                  />
                  <FieldInput
                    label="Nom du parent *"
                    id="parentName"
                    placeholder="Nom complet"
                    value={personalInfo.parentName}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, parentName: e.target.value }))}
                  />
                  <FieldInput
                    label="Email *"
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <FieldInput
                    label="Téléphone *"
                    id="phone"
                    type="tel"
                    prefix="🇲🇦 +212"
                    placeholder="6XX XXX XXX"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                    containerClassName="sm:col-span-2"
                  />
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="notes" className="eyebrow tracking-[0.16em]">
                      Notes / Demandes spéciales (optionnel)
                    </label>
                    <textarea
                      id="notes"
                      placeholder="Allergie alimentaire, demande spéciale…"
                      value={personalInfo.notes}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full rounded-xl border-2 border-input bg-card px-3.5 py-2.5 text-base outline-none transition-colors placeholder:text-mute focus:border-ink md:text-sm"
                    />
                  </div>
                </div>
              </StickerCard>
            </div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-extrabold">Récapitulatif de ta réservation</h2>
                <p className="mt-2 text-mute">Vérifie tous les détails avant de payer</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <StickerCard className="p-6">
                    <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
                      <CalendarIcon className="size-5 text-pink" aria-hidden="true" />
                      Date et invités
                    </h3>
                    <div className="mt-4 space-y-2 text-sm">
                      <p><strong>Date :</strong> {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p><strong>Nombre d'invités :</strong> {guestCount} personnes</p>
                    </div>
                  </StickerCard>

                  <StickerCard className="p-6">
                    <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
                      <Gift className="size-5 text-pink" aria-hidden="true" />
                      Formule
                    </h3>
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="font-display text-lg font-bold">{selectedPack?.name}</p>
                      {selectedPack?.description && (
                        <p className="text-mute">{selectedPack.description}</p>
                      )}
                      <p className="text-mute">Inclus {selectedPack?.included_guests} invités</p>
                    </div>
                  </StickerCard>

                  {selectedExtraIds.length > 0 && (
                    <StickerCard className="p-6">
                      <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
                        <Sparkles className="size-5 text-pink" aria-hidden="true" />
                        Options supplémentaires
                      </h3>
                      <ul className="mt-4 space-y-2 text-sm">
                        {selectedExtraIds.map(extraId => {
                          const extra = extras.find(e => e.id === extraId)
                          return extra ? (
                            <li key={extraId} className="flex justify-between">
                              <span>{extra.name}</span>
                              <span className="font-mono font-bold">+{extra.price} DH</span>
                            </li>
                          ) : null
                        })}
                      </ul>
                    </StickerCard>
                  )}

                  <StickerCard className="p-6">
                    <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
                      <Users className="size-5 text-pink" aria-hidden="true" />
                      Informations
                    </h3>
                    <div className="mt-4 space-y-2 text-sm">
                      <p><strong>Enfant :</strong> {personalInfo.childName}, {personalInfo.childAge} ans</p>
                      <p><strong>Parent :</strong> {personalInfo.parentName}</p>
                      <p><strong>Contact :</strong> {personalInfo.email} / {personalInfo.phone}</p>
                      {personalInfo.notes && (
                        <p><strong>Notes :</strong> {personalInfo.notes}</p>
                      )}
                    </div>
                  </StickerCard>
                </div>

                <div>
                  <div className="sticky top-32 space-y-4">
                    <DarkSurface tone="pink" shadow className="p-6">
                      <p className="eyebrow tracking-[0.16em] text-paper/60">Total à payer</p>
                      <p className="mt-2 font-display text-[clamp(2.5rem,8vw,3.25rem)] font-extrabold leading-none tabular-nums text-pink">
                        {totalPrice}
                        <span className="ml-1.5 align-baseline font-mono text-base font-medium text-paper/60">DH</span>
                      </p>
                      <div className="mt-5 space-y-2 border-t-2 border-paper/15 pt-4 font-mono text-sm">
                        <div className="flex justify-between text-paper/80">
                          <span>Formule de base</span>
                          <span className="font-bold text-paper">{selectedPack?.base_price} DH</span>
                        </div>
                        {guestCount > (selectedPack?.included_guests || 0) && (
                          <div className="flex justify-between text-paper/60">
                            <span>Invités supp. ({guestCount - (selectedPack?.included_guests || 0)} × 150 DH)</span>
                            <span>+{(guestCount - (selectedPack?.included_guests || 0)) * 150} DH</span>
                          </div>
                        )}
                        {selectedExtraIds.map(extraId => {
                          const extra = extras.find(e => e.id === extraId)
                          return extra ? (
                            <div key={extraId} className="flex justify-between text-paper/60">
                              <span>{extra.name}</span>
                              <span>+{extra.price} DH</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </DarkSurface>
                    <Button
                      className="w-full"
                      variant="pink"
                      size="lg"
                      onClick={handlePayment}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
                          Création…
                        </>
                      ) : (
                        <>
                          Payer maintenant
                          <ArrowRight className="ml-2 size-5" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-mute">
                      Paiement sécurisé par carte bancaire ou virement
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 6 && orderCreated && (
            <div className="space-y-8">
              <NivCelebration
                tone="lime"
                title="Réservation confirmée"
                caption="Ton anniversaire est réservé. On a hâte d'y être !"
                palette="reward"
              />

              <div className="mx-auto max-w-2xl space-y-6">
                <DarkSurface tone="pink" shadow className="p-8">
                  <div className="text-center">
                    <p className="eyebrow tracking-[0.16em] text-paper/60">Référence de commande</p>
                    <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-pink">{orderCreated.reference_code}</p>
                  </div>

                  {orderCreated.qr_code && (
                    <div className="mt-6 flex flex-col items-center gap-4 border-t-2 border-paper/15 pt-6">
                      <QrCode className="size-7 text-paper/70" aria-hidden="true" />
                      <div className="size-64 rounded-xl border-2 border-ink bg-white p-4">
                        <Image
                          src={orderCreated.qr_code}
                          alt="QR Code"
                          width={256}
                          height={256}
                          className="size-full"
                        />
                      </div>
                      <p className="text-center text-sm text-paper/70">
                        Présente ce QR code le jour de ton anniversaire
                      </p>
                    </div>
                  )}

                  <div className="mt-6 space-y-3 border-t-2 border-paper/15 pt-6 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-paper/60">Date</span>
                      <span className="font-bold text-paper">{new Date(orderCreated.event_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-paper/60">Invités</span>
                      <span className="font-bold text-paper">{orderCreated.guest_count} personnes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-paper/60">Total</span>
                      <span className="font-bold text-pink">{orderCreated.total_price} DH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-paper/60">Statut paiement</span>
                      <span className="font-bold capitalize text-paper">{orderCreated.payment_status}</span>
                    </div>
                  </div>
                </DarkSurface>

                <StickerCard className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-teal/15 text-lg" aria-hidden="true">📧</span>
                    <p className="text-sm">
                      Un email de confirmation a été envoyé à <strong>{personalInfo.email}</strong>
                    </p>
                  </div>
                </StickerCard>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push('/profile/commandes')}
                  >
                    Mes commandes
                  </Button>
                  <Button
                    variant="pink"
                    className="flex-1"
                    onClick={() => router.push('/agenda')}
                  >
                    Retour aux événements
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 6 && (
            <div className="mt-12 flex items-center justify-between border-t-2 border-ink pt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as Step)}
                disabled={currentStep === 1}
              >
                Retour
              </Button>
              <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-mute">
                Étape {currentStep} sur 5
              </div>
              {currentStep < 5 ? (
                <Button
                  variant="pink"
                  onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1) as Step)}
                  disabled={!canProceed()}
                >
                  Continuer
                  <ChevronRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Recommencer
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

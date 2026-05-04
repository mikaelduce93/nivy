"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Gift, CheckCircle2, Users, Music, Camera, Cake, Sparkles, ArrowRight, PartyPopper, Crown, Heart, Clock, Shield, Phone, CalendarIcon, ChevronRight, Check, Minus, Plus, Loader2, QrCode } from 'lucide-react'
import { toast } from "sonner"
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
        toast.error("Erreur lors du chargement des données")
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
      toast.error("Erreur lors de la création de la commande")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des formules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-24">
        <div className="absolute inset-0 z-0">
          <Image
            src="/birthday-cake-sparklers-celebration.jpg"
            alt="Anniversaire"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-4 backdrop-blur-sm">
            <PartyPopper className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-medium text-pink-500">Configurateur Anniversaire</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            Configure ton Anniversaire
            <br />
            <span className="text-gradient">de Rêve</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Personnalise chaque détail en 5 étapes simples
          </p>
        </div>
      </section>

      {/* Stepper */}
      {currentStep < 6 && (
        <section className="py-8 bg-secondary/30 sticky top-16 z-40 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        currentStep > step.number
                          ? "bg-primary text-primary-foreground"
                          : currentStep === step.number
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${currentStep >= step.number ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${currentStep > step.number ? "bg-primary" : "bg-secondary"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Step Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

          {/* Step 1: Date & Guests */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2">Quand veux-tu faire la fête ?</h2>
                <p className="text-muted-foreground">Choisis une date et le nombre d'invités</p>
              </div>

              <Card className="p-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-bold mb-4 block">Sélectionne la date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mx-auto"
                    />
                  </div>

                  <div className="space-y-6">
                    {teens.length > 0 && (
                      <div>
                        <Label className="text-lg font-bold mb-4 block">Pour quel enfant ? (optionnel)</Label>
                        <select
                          className="w-full p-3 rounded-lg border bg-background"
                          value={selectedTeenId}
                          onChange={(e) => setSelectedTeenId(e.target.value)}
                        >
                          <option value="">Sélectionner un enfant</option>
                          {teens.map((teen: any) => (
                            <option key={teen.id} value={teen.id}>
                              {teen.pseudo || `${teen.first_name} ${teen.last_name}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label className="text-lg font-bold mb-4 block">Nombre d'invités</Label>
                      <div className="flex items-center gap-4 bg-secondary p-4 rounded-lg">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center">
                          <div className="text-4xl font-black">{guestCount}</div>
                          <div className="text-sm text-muted-foreground">invités</div>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setGuestCount(guestCount + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {selectedDate && (
                      <Card className="p-6 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-3">
                          <CalendarIcon className="w-5 h-5 text-primary mt-1" />
                          <div>
                            <p className="font-bold mb-1">Date sélectionnée</p>
                            <p className="text-2xl font-black text-primary">
                              {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Formula */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2">Choisis ta formule</h2>
                <p className="text-muted-foreground">Packs pour anniversaire pendant nos events</p>
              </div>

              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {packs.map((pack) => (
                  <Card
                    key={pack.id}
                    className={`overflow-hidden cursor-pointer transition-all ${
                      selectedPackId === pack.id ? "ring-4 ring-primary" : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPackId(pack.id)}
                  >
                    <div className="relative h-48 bg-gradient-to-br from-pink-500 to-purple-500">
                      {pack.image_url && (
                        <Image
                          src={pack.image_url}
                          alt={pack.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 33vw"
                        />
                      )}
                      {selectedPackId === pack.id && (
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                      {pack.description && (
                        <p className="text-sm text-muted-foreground mb-3">{pack.description}</p>
                      )}
                      <p className="text-3xl font-black text-primary mb-4">{pack.base_price} DH</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Inclus {pack.included_guests} invités
                      </p>
                      {pack.features && Array.isArray(pack.features) && pack.features.length > 0 && (
                        <ul className="space-y-2">
                          {pack.features.map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {packs.length === 0 && (
                <Card className="p-12 text-center">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune formule disponible pour le moment</p>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Extras */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2">Options Supplémentaires</h2>
                <p className="text-muted-foreground">Ajoute des extras pour rendre ta fête encore plus exceptionnelle (optionnel)</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {extras.map((extra) => {
                  const IconComponent = extra.category === 'entertainment' ? Music :
                                       extra.category === 'photo_video' ? Camera :
                                       extra.category === 'decor' ? Sparkles :
                                       extra.category === 'transport' ? Crown : Gift

                  return (
                    <Card
                      key={extra.id}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedExtraIds.includes(extra.id) ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedExtraIds(prev =>
                          prev.includes(extra.id)
                            ? prev.filter(id => id !== extra.id)
                            : [...prev, extra.id]
                        )
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedExtraIds.includes(extra.id) ? "bg-primary text-primary-foreground" : "bg-secondary"
                        }`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        {selectedExtraIds.includes(extra.id) && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold mb-2">{extra.name}</h4>
                      {extra.description && (
                        <p className="text-sm text-muted-foreground mb-3">{extra.description}</p>
                      )}
                      <p className="text-2xl font-black text-primary">+{extra.price} DH</p>
                    </Card>
                  )
                })}
              </div>

              {extras.length === 0 && (
                <Card className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun extra disponible pour le moment</p>
                  <Button
                    className="mt-4"
                    onClick={() => setCurrentStep(4)}
                  >
                    Passer cette étape
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Personal Info */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2">Informations Personnelles</h2>
                <p className="text-muted-foreground">Quelques infos pour finaliser ta réservation</p>
              </div>

              <Card className="p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="childName">Prénom de l'enfant *</Label>
                    <Input
                      id="childName"
                      placeholder="Prénom"
                      value={personalInfo.childName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, childName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="childAge">Âge de l'enfant *</Label>
                    <Input
                      id="childAge"
                      type="number"
                      placeholder="Âge"
                      value={personalInfo.childAge}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, childAge: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Nom du parent *</Label>
                    <Input
                      id="parentName"
                      placeholder="Nom complet"
                      value={personalInfo.parentName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, parentName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+212 6XX XXX XXX"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notes / Demandes spéciales (optionnel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Allergie alimentaire, demande spéciale..."
                      value={personalInfo.notes}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black mb-2">Récapitulatif de ta réservation</h2>
                <p className="text-muted-foreground">Vérifie tous les détails avant de payer</p>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      Date et Invités
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Date:</strong> {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p><strong>Nombre d'invités:</strong> {guestCount} personnes</p>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-primary" />
                      Formule
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-bold text-lg">{selectedPack?.name}</p>
                      {selectedPack?.description && (
                        <p className="text-muted-foreground">{selectedPack.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Inclus {selectedPack?.included_guests} invités</p>
                    </div>
                  </Card>

                  {selectedExtraIds.length > 0 && (
                    <Card className="p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Options Supplémentaires
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {selectedExtraIds.map(extraId => {
                          const extra = extras.find(e => e.id === extraId)
                          return extra ? (
                            <li key={extraId} className="flex justify-between">
                              <span>{extra.name}</span>
                              <span className="font-bold">+{extra.price} DH</span>
                            </li>
                          ) : null
                        })}
                      </ul>
                    </Card>
                  )}

                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Informations
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Enfant:</strong> {personalInfo.childName}, {personalInfo.childAge} ans</p>
                      <p><strong>Parent:</strong> {personalInfo.parentName}</p>
                      <p><strong>Contact:</strong> {personalInfo.email} / {personalInfo.phone}</p>
                      {personalInfo.notes && (
                        <p><strong>Notes:</strong> {personalInfo.notes}</p>
                      )}
                    </div>
                  </Card>
                </div>

                <div>
                  <Card className="p-6 sticky top-32">
                    <h3 className="font-bold text-lg mb-4">Total</h3>
                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex justify-between">
                        <span>Formule de base</span>
                        <span className="font-bold">{selectedPack?.base_price} DH</span>
                      </div>
                      {guestCount > (selectedPack?.included_guests || 0) && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Invités supplémentaires ({guestCount - (selectedPack?.included_guests || 0)} × 150 DH)</span>
                          <span>+{(guestCount - (selectedPack?.included_guests || 0)) * 150} DH</span>
                        </div>
                      )}
                      {selectedExtraIds.map(extraId => {
                        const extra = extras.find(e => e.id === extraId)
                        return extra ? (
                          <div key={extraId} className="flex justify-between text-muted-foreground">
                            <span>{extra.name}</span>
                            <span>+{extra.price} DH</span>
                          </div>
                        ) : null
                      })}
                      <div className="border-t pt-3 flex justify-between text-2xl font-black text-primary">
                        <span>Total</span>
                        <span>{totalPrice} DH</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                      size="lg"
                      onClick={handlePayment}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          Payer maintenant
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Paiement sécurisé par carte bancaire ou virement
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 6 && orderCreated && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-black mb-2">Réservation Confirmée !</h2>
                <p className="text-muted-foreground">Ton anniversaire est réservé 🎉</p>
              </div>

              <Card className="p-8 max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Référence de commande</p>
                    <p className="text-2xl font-black text-primary">{orderCreated.reference_code}</p>
                  </div>

                  {orderCreated.qr_code && (
                    <div className="flex flex-col items-center gap-4 py-6 border-y">
                      <QrCode className="w-8 h-8 text-muted-foreground" />
                      <div className="w-64 h-64 bg-white p-4 rounded-lg">
                        <Image
                          src={orderCreated.qr_code}
                          alt="QR Code"
                          width={256}
                          height={256}
                          className="w-full h-full"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Présente ce QR code le jour de ton anniversaire
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-bold">{new Date(orderCreated.event_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invités</span>
                      <span className="font-bold">{orderCreated.guest_count} personnes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-primary">{orderCreated.total_price} DH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut paiement</span>
                      <span className="font-bold capitalize">{orderCreated.payment_status}</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm">
                      📧 Un email de confirmation a été envoyé à <strong>{personalInfo.email}</strong>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push('/profile/commandes')}
                    >
                      Mes commandes
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => router.push('/evenements')}
                    >
                      Retour aux événements
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 6 && (
            <div className="flex items-center justify-between mt-12 pt-8 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as Step)}
                disabled={currentStep === 1}
              >
                Retour
              </Button>
              <div className="text-sm text-muted-foreground">
                Étape {currentStep} sur 5
              </div>
              {currentStep < 5 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1) as Step)}
                  disabled={!canProceed()}
                >
                  Continuer
                  <ChevronRight className="w-4 h-4 ml-2" />
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

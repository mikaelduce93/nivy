'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight, Dumbbell, Building2, CreditCard, CheckCircle, Phone, Mail, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClubPartnerFormProps {
  onBack: () => void
}

interface ClubOffering {
  id: string
  offeringName: string
  description: string
  offeringType: 'membership' | 'class_package' | 'single_class' | 'workshop'
  basePrice: string
  billingCycle: string
  skillLevel: string
  maxParticipants: string
}

const STEPS = [
  { id: 1, title: 'Informations club', icon: Building2 },
  { id: 2, title: 'Installations & Services', icon: Dumbbell },
  { id: 3, title: 'Offres & Tarifs', icon: CreditCard },
  { id: 4, title: 'Confirmation', icon: CheckCircle }
]

const CLUB_TYPES = [
  'Fitness', 'Sports', 'Arts', 'Musique', 'Langues', 'Technologie', 'Danse', 'Arts martiaux'
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'all_levels', label: 'Tous niveaux' }
]

const BILLING_CYCLES = [
  { value: 'one_time', label: 'Paiement unique' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly', label: 'Annuel' }
]

const OFFERING_TYPES = [
  { value: 'membership', label: 'Abonnement' },
  { value: 'class_package', label: 'Package de cours' },
  { value: 'single_class', label: 'Cours unique' },
  { value: 'workshop', label: 'Atelier' }
]

export default function ClubPartnerForm({ onBack }: ClubPartnerFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Club Information
  const [companyName, setCompanyName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [taxId, setTaxId] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [description, setDescription] = useState('')

  // Contact Person
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonRole, setContactPersonRole] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [contactPersonEmail, setContactPersonEmail] = useState('')

  // Step 2: Club Details
  const [clubType, setClubType] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [offersTrialSession, setOffersTrialSession] = useState(false)
  const [trialSessionPrice, setTrialSessionPrice] = useState('')
  const [instructorQualifications, setInstructorQualifications] = useState('')

  // Step 3: Offerings
  const [offerings, setOfferings] = useState<ClubOffering[]>([
    {
      id: '1',
      offeringName: '',
      description: '',
      offeringType: 'membership',
      basePrice: '',
      billingCycle: 'monthly',
      skillLevel: 'all_levels',
      maxParticipants: ''
    }
  ])

  const addOffering = () => {
    setOfferings([...offerings, {
      id: Date.now().toString(),
      offeringName: '',
      description: '',
      offeringType: 'membership',
      basePrice: '',
      billingCycle: 'monthly',
      skillLevel: 'all_levels',
      maxParticipants: ''
    }])
  }

  const removeOffering = (id: string) => {
    if (offerings.length > 1) {
      setOfferings(offerings.filter(off => off.id !== id))
    }
  }

  const updateOffering = (id: string, field: keyof ClubOffering, value: any) => {
    setOfferings(offerings.map(off =>
      off.id === id ? { ...off, [field]: value } : off
    ))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return companyName && email && phone && address && city && contactPersonName
      case 2:
        return clubType
      case 3:
        return offerings.every(off => off.offeringName && off.basePrice)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      onBack()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const clubData = {
        partner_type: 'club',
        company_name: companyName,
        company_registration_number: registrationNumber,
        tax_id: taxId,
        email,
        phone,
        website,
        address,
        city,
        postal_code: postalCode,
        description,
        contact_person_name: contactPersonName,
        contact_person_role: contactPersonRole,
        contact_person_phone: contactPersonPhone,
        contact_person_email: contactPersonEmail,
        club_details: {
          club_type: clubType,
          specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
          min_age: minAge ? parseInt(minAge) : null,
          max_age: maxAge ? parseInt(maxAge) : null,
          offers_trial_session: offersTrialSession,
          trial_session_price: trialSessionPrice ? parseFloat(trialSessionPrice) : null,
          instructor_qualifications: instructorQualifications
        },
        offerings: offerings.map(off => ({
          offering_name: off.offeringName,
          description: off.description,
          offering_type: off.offeringType,
          base_price: parseFloat(off.basePrice),
          billing_cycle: off.billingCycle,
          skill_level: off.skillLevel,
          max_participants: off.maxParticipants ? parseInt(off.maxParticipants) : null
        }))
      }

      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clubData)
      })

      if (!response.ok) throw new Error('Erreur lors de l\'inscription')

      router.push('/partenaires/merci')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  currentStep >= step.id
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-2 text-center ${
                  currentStep >= step.id ? 'text-green-400' : 'text-zinc-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-zinc-800'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >

        {/* Step 1: Club Information */}
        {currentStep === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-400" />
                Informations sur votre club
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Informations générales sur votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName" className="text-zinc-300">
                    Nom du club *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="FitLife Gym"
                  />
                </div>
                <div>
                  <Label htmlFor="clubType" className="text-zinc-300">
                    Type de club *
                  </Label>
                  <Select value={clubType} onValueChange={setClubType}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white mt-1">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLUB_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="registrationNumber" className="text-zinc-300">
                    N° d'enregistrement
                  </Label>
                  <Input
                    id="registrationNumber"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="RC-123456"
                  />
                </div>
                <div>
                  <Label htmlFor="taxId" className="text-zinc-300">
                    Identifiant fiscal
                  </Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-zinc-300">
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="https://www.club.ma"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address" className="text-zinc-300">
                    Adresse *
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="123 Avenue Hassan II"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-zinc-300">
                    Ville *
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="Rabat"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-zinc-300">
                    Code postal
                  </Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="10000"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-zinc-300">
                    Email professionnel *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white pl-10"
                      placeholder="contact@club.ma"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-zinc-300">
                    Téléphone *
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white pl-10"
                      placeholder="+212 5XX-XXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-zinc-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1 min-h-24"
                  placeholder="Décrivez votre club, vos activités, votre philosophie..."
                />
              </div>

              {/* Contact Person */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Personne de contact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPersonName" className="text-zinc-300">
                      Nom complet *
                    </Label>
                    <Input
                      id="contactPersonName"
                      value={contactPersonName}
                      onChange={(e) => setContactPersonName(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white mt-1"
                      placeholder="Fatima Zahra"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonRole" className="text-zinc-300">
                      Poste / Fonction
                    </Label>
                    <Input
                      id="contactPersonRole"
                      value={contactPersonRole}
                      onChange={(e) => setContactPersonRole(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white mt-1"
                      placeholder="Directrice"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonPhone" className="text-zinc-300">
                      Téléphone
                    </Label>
                    <Input
                      id="contactPersonPhone"
                      type="tel"
                      value={contactPersonPhone}
                      onChange={(e) => setContactPersonPhone(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white mt-1"
                      placeholder="+212 6XX-XXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonEmail" className="text-zinc-300">
                      Email
                    </Label>
                    <Input
                      id="contactPersonEmail"
                      type="email"
                      value={contactPersonEmail}
                      onChange={(e) => setContactPersonEmail(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white mt-1"
                      placeholder="fatima@club.ma"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Step 2: Club Details */}
        {currentStep === 2 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-green-400" />
                Installations & Services
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Détails sur vos installations et spécialités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div>
                <Label htmlFor="specialties" className="text-zinc-300">
                  Spécialités (séparées par des virgules)
                </Label>
                <Input
                  id="specialties"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                  placeholder="Yoga, Pilates, Musculation, Cardio"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Exemple: Yoga, Pilates, Musculation, Cardio
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAge" className="text-zinc-300">
                    Âge minimum
                  </Label>
                  <Input
                    id="minAge"
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAge" className="text-zinc-300">
                    Âge maximum (optionnel)
                  </Label>
                  <Input
                    id="maxAge"
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="18"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="instructorQualifications" className="text-zinc-300">
                  Qualifications des instructeurs
                </Label>
                <Textarea
                  id="instructorQualifications"
                  value={instructorQualifications}
                  onChange={(e) => setInstructorQualifications(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                  placeholder="Tous nos instructeurs sont certifiés et ont plus de 5 ans d'expérience..."
                  rows={3}
                />
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <Checkbox
                    id="offersTrialSession"
                    checked={offersTrialSession}
                    onCheckedChange={(checked) => setOffersTrialSession(checked as boolean)}
                  />
                  <label htmlFor="offersTrialSession" className="text-white font-medium cursor-pointer">
                    Proposer une séance d'essai
                  </label>
                </div>
                {offersTrialSession && (
                  <div>
                    <Label htmlFor="trialSessionPrice" className="text-zinc-300">
                      Prix de la séance d'essai (DH)
                    </Label>
                    <Input
                      id="trialSessionPrice"
                      type="number"
                      value={trialSessionPrice}
                      onChange={(e) => setTrialSessionPrice(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      placeholder="50.00"
                    />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        )}

        {/* Step 3: Offerings */}
        {currentStep === 3 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-400" />
                Offres & Tarifs
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Abonnements, cours et packages proposés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {offerings.map((offering, index) => (
                <div key={offering.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Offre {index + 1}
                    </h4>
                    {offerings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOffering(offering.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-zinc-300">Nom de l'offre *</Label>
                        <Input
                          value={offering.offeringName}
                          onChange={(e) => updateOffering(offering.id, 'offeringName', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          placeholder="Abonnement Mensuel Illimité"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300">Type d'offre</Label>
                        <Select
                          value={offering.offeringType}
                          onValueChange={(value: any) => updateOffering(offering.id, 'offeringType', value)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OFFERING_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-zinc-300">Description</Label>
                      <Textarea
                        value={offering.description}
                        onChange={(e) => updateOffering(offering.id, 'description', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Détails de l'offre, ce qui est inclus..."
                        rows={2}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-zinc-300">Prix de base (DH) *</Label>
                        <Input
                          type="number"
                          value={offering.basePrice}
                          onChange={(e) => updateOffering(offering.id, 'basePrice', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          placeholder="299.00"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300">Cycle de facturation</Label>
                        <Select
                          value={offering.billingCycle}
                          onValueChange={(value) => updateOffering(offering.id, 'billingCycle', value)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BILLING_CYCLES.map(cycle => (
                              <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-zinc-300">Niveau</Label>
                        <Select
                          value={offering.skillLevel}
                          onValueChange={(value) => updateOffering(offering.id, 'skillLevel', value)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-zinc-300">Max. participants (optionnel)</Label>
                      <Input
                        type="number"
                        value={offering.maxParticipants}
                        onChange={(e) => updateOffering(offering.id, 'maxParticipants', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="20"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Laissez vide pour illimité
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addOffering}
                className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une offre
              </Button>

            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Confirmation
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Vérifiez les informations avant de soumettre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Club</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-300"><span className="text-zinc-500">Nom:</span> {companyName}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Type:</span> {clubType}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Adresse:</span> {address}, {city}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Email:</span> {email}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Téléphone:</span> {phone}</p>
                  {specialties && (
                    <p className="text-zinc-300"><span className="text-zinc-500">Spécialités:</span> {specialties}</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Offres ({offerings.length})</h4>
                <div className="space-y-1">
                  {offerings.map((off, idx) => (
                    <p key={off.id} className="text-sm text-zinc-300">
                      {idx + 1}. {off.offeringName || 'Sans nom'} - {off.basePrice} DH
                      {off.billingCycle !== 'one_time' && ` (${BILLING_CYCLES.find(c => c.value === off.billingCycle)?.label})`}
                    </p>
                  ))}
                </div>
              </div>

              {offersTrialSession && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400">
                    ✓ Séance d'essai disponible à {trialSessionPrice} DH
                  </p>
                </div>
              )}

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm text-zinc-300 cursor-pointer">
                    J'accepte les conditions générales du programme partenaire et je confirme que toutes les informations sont exactes.
                  </label>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Retour' : 'Précédent'}
        </Button>

        {currentStep < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!validateStep(currentStep)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

    </div>
  )
}

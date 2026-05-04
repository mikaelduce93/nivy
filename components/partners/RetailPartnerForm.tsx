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
import { ArrowLeft, ArrowRight, Store, MapPin, Percent, Building2, Phone, Mail, Globe, Upload, Plus, Trash2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RetailPartnerFormProps {
  onBack: () => void
}

interface Location {
  id: string
  locationName: string
  address: string
  city: string
  postalCode: string
  phone: string
}

interface Discount {
  id: string
  discountName: string
  description: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: string
  minVipLevel: 'silver' | 'gold' | 'platinum' | ''
  minPurchaseAmount: string
  maxDiscountAmount: string
  validFrom: string
  validUntil: string
  applicableCategories: string[]
}

const STEPS = [
  { id: 1, title: 'Informations entreprise', icon: Building2 },
  { id: 2, title: 'Points de vente', icon: MapPin },
  { id: 3, title: 'Configuration réductions', icon: Percent },
  { id: 4, title: 'Confirmation', icon: CheckCircle }
]

const PRODUCT_CATEGORIES = [
  'Vêtements', 'Chaussures', 'Accessoires', 'Électronique', 'Cosmétiques',
  'Livres', 'Sport', 'Jouets', 'Alimentation', 'Maison & Déco'
]

export default function RetailPartnerForm({ onBack }: RetailPartnerFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Company Information
  const [companyName, setCompanyName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [taxId, setTaxId] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonRole, setContactPersonRole] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [contactPersonEmail, setContactPersonEmail] = useState('')

  // Step 2: Locations
  const [locations, setLocations] = useState<Location[]>([
    {
      id: '1',
      locationName: '',
      address: '',
      city: '',
      postalCode: '',
      phone: ''
    }
  ])

  // Step 3: Discounts
  const [discounts, setDiscounts] = useState<Discount[]>([
    {
      id: '1',
      discountName: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minVipLevel: 'silver',
      minPurchaseAmount: '',
      maxDiscountAmount: '',
      validFrom: '',
      validUntil: '',
      applicableCategories: []
    }
  ])

  const addLocation = () => {
    setLocations([...locations, {
      id: Date.now().toString(),
      locationName: '',
      address: '',
      city: '',
      postalCode: '',
      phone: ''
    }])
  }

  const removeLocation = (id: string) => {
    if (locations.length > 1) {
      setLocations(locations.filter(loc => loc.id !== id))
    }
  }

  const updateLocation = (id: string, field: keyof Location, value: string) => {
    setLocations(locations.map(loc =>
      loc.id === id ? { ...loc, [field]: value } : loc
    ))
  }

  const addDiscount = () => {
    setDiscounts([...discounts, {
      id: Date.now().toString(),
      discountName: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minVipLevel: 'silver',
      minPurchaseAmount: '',
      maxDiscountAmount: '',
      validFrom: '',
      validUntil: '',
      applicableCategories: []
    }])
  }

  const removeDiscount = (id: string) => {
    if (discounts.length > 1) {
      setDiscounts(discounts.filter(disc => disc.id !== id))
    }
  }

  const updateDiscount = (id: string, field: keyof Discount, value: any) => {
    setDiscounts(discounts.map(disc =>
      disc.id === id ? { ...disc, [field]: value } : disc
    ))
  }

  const toggleCategory = (discountId: string, category: string) => {
    setDiscounts(discounts.map(disc => {
      if (disc.id === discountId) {
        const categories = disc.applicableCategories.includes(category)
          ? disc.applicableCategories.filter(c => c !== category)
          : [...disc.applicableCategories, category]
        return { ...disc, applicableCategories: categories }
      }
      return disc
    }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return companyName && email && phone && contactPersonName
      case 2:
        return locations.every(loc => loc.locationName && loc.address && loc.city)
      case 3:
        return discounts.every(disc =>
          disc.discountName && disc.discountValue && disc.validFrom && disc.validUntil
        )
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
      const partnerData = {
        partner_type: 'retail',
        company_name: companyName,
        company_registration_number: registrationNumber,
        tax_id: taxId,
        email,
        phone,
        website,
        description,
        contact_person_name: contactPersonName,
        contact_person_role: contactPersonRole,
        contact_person_phone: contactPersonPhone,
        contact_person_email: contactPersonEmail,
        locations: locations.map(loc => ({
          location_name: loc.locationName,
          address: loc.address,
          city: loc.city,
          postal_code: loc.postalCode,
          phone: loc.phone
        })),
        discounts: discounts.map(disc => ({
          discount_name: disc.discountName,
          description: disc.description,
          discount_type: disc.discountType,
          discount_value: parseFloat(disc.discountValue),
          min_vip_level: disc.minVipLevel,
          min_purchase_amount: disc.minPurchaseAmount ? parseFloat(disc.minPurchaseAmount) : null,
          max_discount_amount: disc.maxDiscountAmount ? parseFloat(disc.maxDiscountAmount) : null,
          valid_from: disc.validFrom,
          valid_until: disc.validUntil,
          applicable_categories: disc.applicableCategories
        }))
      }

      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerData)
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
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-2 text-center ${
                  currentStep >= step.id ? 'text-blue-400' : 'text-zinc-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-zinc-800'
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

        {/* Step 1: Company Information */}
        {currentStep === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Informations sur votre entreprise
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Veuillez fournir les informations de base sur votre commerce
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName" className="text-zinc-300">
                    Nom de l'entreprise *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="Ma Boutique SARL"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNumber" className="text-zinc-300">
                    Numéro d'enregistrement
                  </Label>
                  <Input
                    id="registrationNumber"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="RC-123456"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxId" className="text-zinc-300">
                    Identifiant fiscal (IF)
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
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              {/* Contact Information */}
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
                      placeholder="contact@example.com"
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
                      placeholder="+212 6XX-XXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-zinc-300">
                  Description de votre commerce
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1 min-h-24"
                  placeholder="Décrivez votre commerce, vos produits, votre spécialité..."
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
                      placeholder="Ahmed Benali"
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
                      placeholder="Gérant"
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
                      placeholder="ahmed@example.com"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Step 2: Locations */}
        {currentStep === 2 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Points de vente
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Ajoutez tous vos magasins et points de vente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {locations.map((location, index) => (
                <div key={location.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Point de vente {index + 1}
                    </h4>
                    {locations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLocation(location.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-zinc-300">Nom du point de vente *</Label>
                      <Input
                        value={location.locationName}
                        onChange={(e) => updateLocation(location.id, 'locationName', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Boutique Centre-Ville"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-zinc-300">Adresse *</Label>
                      <Input
                        value={location.address}
                        onChange={(e) => updateLocation(location.id, 'address', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="123 Avenue Mohammed V"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Ville *</Label>
                      <Input
                        value={location.city}
                        onChange={(e) => updateLocation(location.id, 'city', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Casablanca"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Code postal</Label>
                      <Input
                        value={location.postalCode}
                        onChange={(e) => updateLocation(location.id, 'postalCode', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="20000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-zinc-300">Téléphone</Label>
                      <Input
                        type="tel"
                        value={location.phone}
                        onChange={(e) => updateLocation(location.id, 'phone', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="+212 5XX-XXXXXX"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addLocation}
                className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un point de vente
              </Button>

            </CardContent>
          </Card>
        )}

        {/* Step 3: Discounts */}
        {currentStep === 3 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-400" />
                Configuration des réductions
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Définissez les réductions pour les détenteurs de cartes VIP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {discounts.map((discount, index) => (
                <div key={discount.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Réduction {index + 1}
                    </h4>
                    {discounts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDiscount(discount.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-zinc-300">Nom de la réduction *</Label>
                        <Input
                          value={discount.discountName}
                          onChange={(e) => updateDiscount(discount.id, 'discountName', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          placeholder="Réduction VIP"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300">Niveau VIP minimum</Label>
                        <Select
                          value={discount.minVipLevel}
                          onValueChange={(value) => updateDiscount(discount.id, 'minVipLevel', value)}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="silver">Silver (10%)</SelectItem>
                            <SelectItem value="gold">Gold (20%)</SelectItem>
                            <SelectItem value="platinum">Platinum (30%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-zinc-300">Description</Label>
                      <Textarea
                        value={discount.description}
                        onChange={(e) => updateDiscount(discount.id, 'description', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Détails de l'offre..."
                        rows={2}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-zinc-300">Type de réduction</Label>
                        <Select
                          value={discount.discountType}
                          onValueChange={(value: 'percentage' | 'fixed_amount') =>
                            updateDiscount(discount.id, 'discountType', value)
                          }
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Pourcentage</SelectItem>
                            <SelectItem value="fixed_amount">Montant fixe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-zinc-300">
                          Valeur * {discount.discountType === 'percentage' ? '(%)' : '(DH)'}
                        </Label>
                        <Input
                          type="number"
                          value={discount.discountValue}
                          onChange={(e) => updateDiscount(discount.id, 'discountValue', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          placeholder={discount.discountType === 'percentage' ? '15' : '50'}
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300">Achat minimum (DH)</Label>
                        <Input
                          type="number"
                          value={discount.minPurchaseAmount}
                          onChange={(e) => updateDiscount(discount.id, 'minPurchaseAmount', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          placeholder="200"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-zinc-300">Valide du *</Label>
                        <Input
                          type="date"
                          value={discount.validFrom}
                          onChange={(e) => updateDiscount(discount.id, 'validFrom', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-300">Valide jusqu'au *</Label>
                        <Input
                          type="date"
                          value={discount.validUntil}
                          onChange={(e) => updateDiscount(discount.id, 'validUntil', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-zinc-300 mb-2 block">Catégories applicables</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {PRODUCT_CATEGORIES.map(category => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${discount.id}-${category}`}
                              checked={discount.applicableCategories.includes(category)}
                              onCheckedChange={() => toggleCategory(discount.id, category)}
                            />
                            <label
                              htmlFor={`${discount.id}-${category}`}
                              className="text-sm text-zinc-300 cursor-pointer"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addDiscount}
                className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une réduction
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
                Vérifiez les informations avant de soumettre votre demande
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Summary */}
              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Entreprise</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-300"><span className="text-zinc-500">Nom:</span> {companyName}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Email:</span> {email}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Téléphone:</span> {phone}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Contact:</span> {contactPersonName}</p>
                </div>
              </div>

              {/* Locations Summary */}
              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Points de vente ({locations.length})</h4>
                <div className="space-y-2">
                  {locations.map((loc, idx) => (
                    <p key={loc.id} className="text-sm text-zinc-300">
                      {idx + 1}. {loc.locationName} - {loc.city}
                    </p>
                  ))}
                </div>
              </div>

              {/* Discounts Summary */}
              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Réductions ({discounts.length})</h4>
                <div className="space-y-2">
                  {discounts.map((disc, idx) => (
                    <p key={disc.id} className="text-sm text-zinc-300">
                      {idx + 1}. {disc.discountName} - {disc.discountValue}{disc.discountType === 'percentage' ? '%' : ' DH'}
                      {' '}(VIP {disc.minVipLevel}+)
                    </p>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm text-zinc-300 cursor-pointer">
                    J'accepte les conditions générales du programme partenaire et je confirme que toutes les informations fournies sont exactes.
                  </label>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

      </motion.div>

      {/* Navigation Buttons */}
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
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

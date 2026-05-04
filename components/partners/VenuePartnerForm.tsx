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
import { ArrowLeft, ArrowRight, Building2, UtensilsCrossed, Package, Activity, Phone, Mail, CheckCircle, Upload, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface VenuePartnerFormProps {
  onBack: () => void
}

interface MenuItem {
  id: string
  itemName: string
  description: string
  category: string
  basePrice: string
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
}

interface EventPackage {
  id: string
  packageName: string
  description: string
  packageType: string
  minGuests: string
  maxGuests: string
  basePricePerPerson: string
  durationHours: string
}

const STEPS = [
  { id: 1, title: 'Informations générales', icon: Building2 },
  { id: 2, title: 'Menu & Services', icon: UtensilsCrossed },
  { id: 3, title: 'Packages événements', icon: Package },
  { id: 4, title: 'Confirmation', icon: CheckCircle }
]

const VENUE_TYPES = [
  'Restaurant', 'Café', 'Salle de fête', 'Lounge', 'Terrasse', 'Espace événementiel'
]

const CUISINE_TYPES = [
  'Marocaine', 'Française', 'Italienne', 'Asiatique', 'Fast Food', 'Fusion', 'Végétarienne', 'Autre'
]

const MENU_CATEGORIES = [
  'Entrées', 'Plats principaux', 'Desserts', 'Boissons', 'Snacks'
]

const PACKAGE_TYPES = [
  'Anniversaire', 'Entreprise', 'Mariage', 'Casual', 'Thématique'
]

export default function VenuePartnerForm({ onBack }: VenuePartnerFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: General Information
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

  // Venue Details
  const [venueType, setVenueType] = useState('')
  const [capacity, setCapacity] = useState('')
  const [hasParking, setHasParking] = useState(false)
  const [hasWifi, setHasWifi] = useState(false)
  const [hasOutdoorSeating, setHasOutdoorSeating] = useState(false)
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState('')

  // Contact Person
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonRole, setContactPersonRole] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [contactPersonEmail, setContactPersonEmail] = useState('')

  // Step 2: Menu Items
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: '1',
      itemName: '',
      description: '',
      category: 'Plats principaux',
      basePrice: '',
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false
    }
  ])

  // Step 3: Event Packages
  const [eventPackages, setEventPackages] = useState<EventPackage[]>([
    {
      id: '1',
      packageName: '',
      description: '',
      packageType: 'Anniversaire',
      minGuests: '',
      maxGuests: '',
      basePricePerPerson: '',
      durationHours: ''
    }
  ])

  const toggleCuisineType = (type: string) => {
    setCuisineTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const addMenuItem = () => {
    setMenuItems([...menuItems, {
      id: Date.now().toString(),
      itemName: '',
      description: '',
      category: 'Plats principaux',
      basePrice: '',
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false
    }])
  }

  const removeMenuItem = (id: string) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter(item => item.id !== id))
    }
  }

  const updateMenuItem = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(menuItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const addEventPackage = () => {
    setEventPackages([...eventPackages, {
      id: Date.now().toString(),
      packageName: '',
      description: '',
      packageType: 'Anniversaire',
      minGuests: '',
      maxGuests: '',
      basePricePerPerson: '',
      durationHours: ''
    }])
  }

  const removeEventPackage = (id: string) => {
    if (eventPackages.length > 1) {
      setEventPackages(eventPackages.filter(pkg => pkg.id !== id))
    }
  }

  const updateEventPackage = (id: string, field: keyof EventPackage, value: string) => {
    setEventPackages(eventPackages.map(pkg =>
      pkg.id === id ? { ...pkg, [field]: value } : pkg
    ))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return companyName && email && phone && address && city && venueType && contactPersonName
      case 2:
        return menuItems.every(item => item.itemName && item.basePrice)
      case 3:
        return eventPackages.every(pkg =>
          pkg.packageName && pkg.minGuests && pkg.maxGuests && pkg.basePricePerPerson && pkg.durationHours
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
      const venueData = {
        partner_type: 'venue',
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
        venue_details: {
          venue_type: venueType,
          capacity: capacity ? parseInt(capacity) : null,
          has_parking: hasParking,
          has_wifi: hasWifi,
          has_outdoor_seating: hasOutdoorSeating,
          cuisine_types: cuisineTypes,
          price_range: priceRange
        },
        menu_items: menuItems.map(item => ({
          item_name: item.itemName,
          description: item.description,
          category: item.category,
          base_price: parseFloat(item.basePrice),
          is_vegetarian: item.isVegetarian,
          is_vegan: item.isVegan,
          is_gluten_free: item.isGlutenFree
        })),
        event_packages: eventPackages.map(pkg => ({
          package_name: pkg.packageName,
          description: pkg.description,
          package_type: pkg.packageType,
          min_guests: parseInt(pkg.minGuests),
          max_guests: parseInt(pkg.maxGuests),
          base_price_per_person: parseFloat(pkg.basePricePerPerson),
          duration_hours: parseInt(pkg.durationHours)
        }))
      }

      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueData)
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
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-2 text-center ${
                  currentStep >= step.id ? 'text-purple-400' : 'text-zinc-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-purple-600' : 'bg-zinc-800'
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

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Informations générales
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Informations sur votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName" className="text-zinc-300">
                    Nom de l'établissement *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="Restaurant Le Gourmet"
                  />
                </div>
                <div>
                  <Label htmlFor="venueType" className="text-zinc-300">
                    Type d'établissement *
                  </Label>
                  <Select value={venueType} onValueChange={setVenueType}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white mt-1">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map(type => (
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
                  <Label htmlFor="capacity" className="text-zinc-300">
                    Capacité (personnes)
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="50"
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
                    placeholder="123 Boulevard Zerktouni"
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
                    placeholder="Casablanca"
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
                    placeholder="20000"
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
                      placeholder="contact@restaurant.ma"
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
                <div className="md:col-span-2">
                  <Label htmlFor="website" className="text-zinc-300">
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1"
                    placeholder="https://www.restaurant.ma"
                  />
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
                  placeholder="Décrivez votre établissement, son ambiance, ses spécialités..."
                />
              </div>

              {/* Amenities */}
              <div>
                <Label className="text-zinc-300 mb-3 block">Équipements & Services</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasParking"
                      checked={hasParking}
                      onCheckedChange={(checked) => setHasParking(checked as boolean)}
                    />
                    <label htmlFor="hasParking" className="text-sm text-zinc-300 cursor-pointer">
                      Parking
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasWifi"
                      checked={hasWifi}
                      onCheckedChange={(checked) => setHasWifi(checked as boolean)}
                    />
                    <label htmlFor="hasWifi" className="text-sm text-zinc-300 cursor-pointer">
                      WiFi gratuit
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasOutdoorSeating"
                      checked={hasOutdoorSeating}
                      onCheckedChange={(checked) => setHasOutdoorSeating(checked as boolean)}
                    />
                    <label htmlFor="hasOutdoorSeating" className="text-sm text-zinc-300 cursor-pointer">
                      Terrasse
                    </label>
                  </div>
                </div>
              </div>

              {/* Cuisine Types */}
              <div>
                <Label className="text-zinc-300 mb-3 block">Types de cuisine</Label>
                <div className="grid md:grid-cols-4 gap-2">
                  {CUISINE_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cuisine-${type}`}
                        checked={cuisineTypes.includes(type)}
                        onCheckedChange={() => toggleCuisineType(type)}
                      />
                      <label htmlFor={`cuisine-${type}`} className="text-sm text-zinc-300 cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <Label htmlFor="priceRange" className="text-zinc-300">
                  Gamme de prix
                </Label>
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white mt-1">
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget (€)</SelectItem>
                    <SelectItem value="moderate">Modéré (€€)</SelectItem>
                    <SelectItem value="upscale">Haut de gamme (€€€)</SelectItem>
                    <SelectItem value="luxury">Luxe (€€€€)</SelectItem>
                  </SelectContent>
                </Select>
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
                      placeholder="ahmed@restaurant.ma"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Step 2: Menu Items */}
        {currentStep === 2 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-purple-400" />
                Menu & Articles
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Ajoutez vos plats et services (vous pourrez compléter plus tard)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {menuItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Article {index + 1}
                    </h4>
                    {menuItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMenuItem(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Nom du plat *</Label>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateMenuItem(item.id, 'itemName', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Tagine d'agneau"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Catégorie</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateMenuItem(item.id, 'category', value)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MENU_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-zinc-300">Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Description du plat..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Prix (DH) *</Label>
                      <Input
                        type="number"
                        value={item.basePrice}
                        onChange={(e) => updateMenuItem(item.id, 'basePrice', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="85.00"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 mb-3 block">Régime alimentaire</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${item.id}-vegetarian`}
                            checked={item.isVegetarian}
                            onCheckedChange={(checked) => updateMenuItem(item.id, 'isVegetarian', checked)}
                          />
                          <label htmlFor={`${item.id}-vegetarian`} className="text-sm text-zinc-300">
                            Végétarien
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${item.id}-vegan`}
                            checked={item.isVegan}
                            onCheckedChange={(checked) => updateMenuItem(item.id, 'isVegan', checked)}
                          />
                          <label htmlFor={`${item.id}-vegan`} className="text-sm text-zinc-300">
                            Vegan
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${item.id}-gluten`}
                            checked={item.isGlutenFree}
                            onCheckedChange={(checked) => updateMenuItem(item.id, 'isGlutenFree', checked)}
                          />
                          <label htmlFor={`${item.id}-gluten`} className="text-sm text-zinc-300">
                            Sans gluten
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addMenuItem}
                className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un article
              </Button>

            </CardContent>
          </Card>
        )}

        {/* Step 3: Event Packages */}
        {currentStep === 3 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Packages événements
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Définissez vos offres pour anniversaires, fêtes et événements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {eventPackages.map((pkg, index) => (
                <div key={pkg.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Package {index + 1}
                    </h4>
                    {eventPackages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEventPackage(pkg.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Nom du package *</Label>
                      <Input
                        value={pkg.packageName}
                        onChange={(e) => updateEventPackage(pkg.id, 'packageName', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Package Anniversaire Premium"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Type</Label>
                      <Select
                        value={pkg.packageType}
                        onValueChange={(value) => updateEventPackage(pkg.id, 'packageType', value)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PACKAGE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-zinc-300">Description</Label>
                      <Textarea
                        value={pkg.description}
                        onChange={(e) => updateEventPackage(pkg.id, 'description', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="Ce qui est inclus dans le package..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Min. invités *</Label>
                      <Input
                        type="number"
                        value={pkg.minGuests}
                        onChange={(e) => updateEventPackage(pkg.id, 'minGuests', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Max. invités *</Label>
                      <Input
                        type="number"
                        value={pkg.maxGuests}
                        onChange={(e) => updateEventPackage(pkg.id, 'maxGuests', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Prix/personne (DH) *</Label>
                      <Input
                        type="number"
                        value={pkg.basePricePerPerson}
                        onChange={(e) => updateEventPackage(pkg.id, 'basePricePerPerson', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="150.00"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Durée (heures) *</Label>
                      <Input
                        type="number"
                        value={pkg.durationHours}
                        onChange={(e) => updateEventPackage(pkg.id, 'durationHours', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                        placeholder="4"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addEventPackage}
                className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un package
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
                <h4 className="text-white font-semibold mb-3">Établissement</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-300"><span className="text-zinc-500">Nom:</span> {companyName}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Type:</span> {venueType}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Adresse:</span> {address}, {city}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Email:</span> {email}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500">Téléphone:</span> {phone}</p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Menu ({menuItems.length} articles)</h4>
                <div className="space-y-1">
                  {menuItems.slice(0, 3).map((item, idx) => (
                    <p key={item.id} className="text-sm text-zinc-300">
                      {idx + 1}. {item.itemName || 'Sans nom'} - {item.basePrice} DH
                    </p>
                  ))}
                  {menuItems.length > 3 && (
                    <p className="text-xs text-zinc-500">... et {menuItems.length - 3} autres</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Packages événements ({eventPackages.length})</h4>
                <div className="space-y-1">
                  {eventPackages.map((pkg, idx) => (
                    <p key={pkg.id} className="text-sm text-zinc-300">
                      {idx + 1}. {pkg.packageName || 'Sans nom'} - {pkg.basePricePerPerson} DH/pers
                    </p>
                  ))}
                </div>
              </div>

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
            className="bg-purple-600 hover:bg-purple-700 text-white"
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

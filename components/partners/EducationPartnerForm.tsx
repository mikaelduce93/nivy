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
import { ArrowLeft, ArrowRight, GraduationCap, Building2, BookOpen, CheckCircle, Phone, Mail, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitPartnerWizard } from '@/lib/partners/wizard-submit'
import { PartnerPasswordPanel, isPasswordValid } from '@/components/partners/PartnerPasswordPanel'

interface EducationPartnerFormProps {
  onBack: () => void
}

interface Course {
  id: string
  courseName: string
  description: string
  courseType: string
  duration: string
  durationUnit: 'hours' | 'weeks' | 'months'
  basePrice: string
  skillLevel: string
  maxStudents: string
  requiresPrerequisites: boolean
  prerequisites: string
}

const STEPS = [
  { id: 1, title: 'Informations centre', icon: Building2 },
  { id: 2, title: 'Domaines d\'expertise', icon: BookOpen },
  { id: 3, title: 'Cours & Formations', icon: GraduationCap },
  { id: 4, title: 'Confirmation', icon: CheckCircle }
]

const EDUCATION_TYPES = [
  'Langues', 'Musique', 'Arts', 'Informatique', 'Soutien scolaire',
  'Développement personnel', 'Sciences', 'Autre'
]

const COURSE_TYPES = [
  'Cours individuel', 'Cours collectif', 'Atelier', 'Formation intensive',
  'En ligne', 'Hybride', 'Sur mesure'
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'all_levels', label: 'Tous niveaux' }
]

export default function EducationPartnerForm({ onBack }: EducationPartnerFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  // Step 1: Center Information
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
  // Wave 3A.5 — wizard requires a password (canon §2 stage 2).
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Contact Person
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonRole, setContactPersonRole] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [contactPersonEmail, setContactPersonEmail] = useState('')

  // Step 2: Expertise Areas
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [certifications, setCertifications] = useState('')
  const [teacherQualifications, setTeacherQualifications] = useState('')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [offersOnlineLearning, setOffersOnlineLearning] = useState(false)
  const [offersCertificates, setOffersCertificates] = useState(false)

  // Step 3: Courses
  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      courseName: '',
      description: '',
      courseType: 'Cours collectif',
      duration: '',
      durationUnit: 'hours',
      basePrice: '',
      skillLevel: 'all_levels',
      maxStudents: '',
      requiresPrerequisites: false,
      prerequisites: ''
    }
  ])

  const toggleEducationType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const addCourse = () => {
    setCourses([...courses, {
      id: Date.now().toString(),
      courseName: '',
      description: '',
      courseType: 'Cours collectif',
      duration: '',
      durationUnit: 'hours',
      basePrice: '',
      skillLevel: 'all_levels',
      maxStudents: '',
      requiresPrerequisites: false,
      prerequisites: ''
    }])
  }

  const removeCourse = (id: string) => {
    if (courses.length > 1) {
      setCourses(courses.filter(course => course.id !== id))
    }
  }

  const updateCourse = (id: string, field: keyof Course, value: any) => {
    setCourses(courses.map(course =>
      course.id === id ? { ...course, [field]: value } : course
    ))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return Boolean(companyName && email && phone && address && city && contactPersonName) && isPasswordValid(password, confirmPassword)
      case 2:
        return selectedTypes.length > 0
      case 3:
        return courses.every(course =>
          course.courseName && course.duration && course.basePrice
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
      const educationData = {
        partner_type: 'education',
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
        education_details: {
          education_types: selectedTypes,
          certifications,
          teacher_qualifications: teacherQualifications,
          min_age: minAge ? parseInt(minAge) : null,
          max_age: maxAge ? parseInt(maxAge) : null,
          offers_online_learning: offersOnlineLearning,
          offers_certificates: offersCertificates
        },
        courses: courses.map(course => ({
          course_name: course.courseName,
          description: course.description,
          course_type: course.courseType,
          duration: parseInt(course.duration),
          duration_unit: course.durationUnit,
          base_price: parseFloat(course.basePrice),
          skill_level: course.skillLevel,
          max_students: course.maxStudents ? parseInt(course.maxStudents) : null,
          requires_prerequisites: course.requiresPrerequisites,
          prerequisites: course.prerequisites
        }))
      }

      // Wave 3A.5 — canonical wizard endpoint (no orphan partners).
      const result = await submitPartnerWizard({
        ...(educationData as any),
        password,
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Erreur lors de la soumission')
        return
      }
      toast.success('Demande envoyée. KYC + activation admin requise avant la connexion.')
      router.push(`/partenaires/merci?ref=${result.partner_id ?? ''}`)
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
                    ? 'bg-gold border-gold text-ink'
                    : 'bg-card border-ink text-mute'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-2 text-center ${
                  currentStep >= step.id ? 'text-gold' : 'text-mute'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-gold' : 'bg-card'
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

        {/* Step 1: Center Information */}
        {currentStep === 1 && (
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                Informations sur votre centre
              </CardTitle>
              <CardDescription className="text-mute">
                Informations générales sur votre établissement d'enseignement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="companyName" className="text-ink-2">
                    Nom du centre *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="Centre de Formation Excellence"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNumber" className="text-ink-2">
                    N° d'enregistrement
                  </Label>
                  <Input
                    id="registrationNumber"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="RC-123456"
                  />
                </div>
                <div>
                  <Label htmlFor="taxId" className="text-ink-2">
                    Identifiant fiscal
                  </Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="12345678"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address" className="text-ink-2">
                    Adresse *
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="123 Rue de l'Éducation"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-ink-2">
                    Ville *
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="Marrakech"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-ink-2">
                    Code postal
                  </Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="40000"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-ink-2">
                    Email professionnel *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-ink text-ink pl-10"
                      placeholder="contact@centre.ma"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-ink-2">
                    Téléphone *
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background border-ink text-ink pl-10"
                      placeholder="+212 5XX-XXXXXX"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="website" className="text-ink-2">
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="https://www.centre.ma"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-ink-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-ink text-ink mt-1 min-h-24"
                  placeholder="Décrivez votre centre, votre approche pédagogique, vos points forts..."
                />
              </div>

              {/* Contact Person */}
              <div className="border-t border-ink pt-6">
                <h3 className="text-lg font-semibold text-ink mb-4">Personne de contact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPersonName" className="text-ink-2">
                      Nom complet *
                    </Label>
                    <Input
                      id="contactPersonName"
                      value={contactPersonName}
                      onChange={(e) => setContactPersonName(e.target.value)}
                      className="bg-background border-ink text-ink mt-1"
                      placeholder="Mohamed Alami"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonRole" className="text-ink-2">
                      Poste / Fonction
                    </Label>
                    <Input
                      id="contactPersonRole"
                      value={contactPersonRole}
                      onChange={(e) => setContactPersonRole(e.target.value)}
                      className="bg-background border-ink text-ink mt-1"
                      placeholder="Directeur pédagogique"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonPhone" className="text-ink-2">
                      Téléphone
                    </Label>
                    <Input
                      id="contactPersonPhone"
                      type="tel"
                      value={contactPersonPhone}
                      onChange={(e) => setContactPersonPhone(e.target.value)}
                      className="bg-background border-ink text-ink mt-1"
                      placeholder="+212 6XX-XXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPersonEmail" className="text-ink-2">
                      Email
                    </Label>
                    <Input
                      id="contactPersonEmail"
                      type="email"
                      value={contactPersonEmail}
                      onChange={(e) => setContactPersonEmail(e.target.value)}
                      className="bg-background border-ink text-ink mt-1"
                      placeholder="mohamed@centre.ma"
                    />
                  </div>
                </div>
              </div>

              <PartnerPasswordPanel
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
              />

            </CardContent>
          </Card>
        )}

        {/* Step 2: Expertise Areas */}
        {currentStep === 2 && (
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gold" />
                Domaines d'expertise
              </CardTitle>
              <CardDescription className="text-mute">
                Sélectionnez les domaines dans lesquels vous proposez des formations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div>
                <Label className="text-ink-2 mb-3 block">Types de formation proposés *</Label>
                <div className="grid md:grid-cols-3 gap-3">
                  {EDUCATION_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleEducationType(type)}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm text-ink-2 cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAge" className="text-ink-2">
                    Âge minimum
                  </Label>
                  <Input
                    id="minAge"
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAge" className="text-ink-2">
                    Âge maximum (optionnel)
                  </Label>
                  <Input
                    id="maxAge"
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    className="bg-background border-ink text-ink mt-1"
                    placeholder="18"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="certifications" className="text-ink-2">
                  Certifications et accréditations
                </Label>
                <Textarea
                  id="certifications"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  className="bg-background border-ink text-ink mt-1"
                  placeholder="Liste des certifications officielles, accréditations..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="teacherQualifications" className="text-ink-2">
                  Qualifications des enseignants
                </Label>
                <Textarea
                  id="teacherQualifications"
                  value={teacherQualifications}
                  onChange={(e) => setTeacherQualifications(e.target.value)}
                  className="bg-background border-ink text-ink mt-1"
                  placeholder="Décrivez les qualifications et l'expérience de vos enseignants..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
                  <Checkbox
                    id="offersOnlineLearning"
                    checked={offersOnlineLearning}
                    onCheckedChange={(checked) => setOffersOnlineLearning(checked as boolean)}
                  />
                  <label htmlFor="offersOnlineLearning" className="text-ink-2 cursor-pointer">
                    Proposer des cours en ligne
                  </label>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
                  <Checkbox
                    id="offersCertificates"
                    checked={offersCertificates}
                    onCheckedChange={(checked) => setOffersCertificates(checked as boolean)}
                  />
                  <label htmlFor="offersCertificates" className="text-ink-2 cursor-pointer">
                    Délivrer des certificats de fin de formation
                  </label>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Step 3: Courses */}
        {currentStep === 3 && (
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gold" />
                Cours & Formations
              </CardTitle>
              <CardDescription className="text-mute">
                Définissez vos cours et programmes de formation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {courses.map((course, index) => (
                <div key={course.id} className="p-4 bg-background rounded-lg border border-ink">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-ink font-medium">
                      Cours {index + 1}
                    </h4>
                    {courses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCourse(course.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-ink-2">Nom du cours *</Label>
                        <Input
                          value={course.courseName}
                          onChange={(e) => updateCourse(course.id, 'courseName', e.target.value)}
                          className="bg-card border-ink text-ink mt-1"
                          placeholder="Anglais niveau débutant"
                        />
                      </div>
                      <div>
                        <Label className="text-ink-2">Type de cours</Label>
                        <Select
                          value={course.courseType}
                          onValueChange={(value) => updateCourse(course.id, 'courseType', value)}
                        >
                          <SelectTrigger className="bg-card border-ink text-ink mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COURSE_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-ink-2">Description</Label>
                      <Textarea
                        value={course.description}
                        onChange={(e) => updateCourse(course.id, 'description', e.target.value)}
                        className="bg-card border-ink text-ink mt-1"
                        placeholder="Description du cours, objectifs d'apprentissage..."
                        rows={2}
                      />
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <Label className="text-ink-2">Durée *</Label>
                        <Input
                          type="number"
                          value={course.duration}
                          onChange={(e) => updateCourse(course.id, 'duration', e.target.value)}
                          className="bg-card border-ink text-ink mt-1"
                          placeholder="20"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-ink-2">Unité</Label>
                        <Select
                          value={course.durationUnit}
                          onValueChange={(value: 'hours' | 'weeks' | 'months') =>
                            updateCourse(course.id, 'durationUnit', value)
                          }
                        >
                          <SelectTrigger className="bg-card border-ink text-ink mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Heures</SelectItem>
                            <SelectItem value="weeks">Semaines</SelectItem>
                            <SelectItem value="months">Mois</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-ink-2">Prix (DH) *</Label>
                        <Input
                          type="number"
                          value={course.basePrice}
                          onChange={(e) => updateCourse(course.id, 'basePrice', e.target.value)}
                          className="bg-card border-ink text-ink mt-1"
                          placeholder="1200.00"
                        />
                      </div>
                      <div>
                        <Label className="text-ink-2">Niveau</Label>
                        <Select
                          value={course.skillLevel}
                          onValueChange={(value) => updateCourse(course.id, 'skillLevel', value)}
                        >
                          <SelectTrigger className="bg-card border-ink text-ink mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-ink-2">Max. étudiants</Label>
                        <Input
                          type="number"
                          value={course.maxStudents}
                          onChange={(e) => updateCourse(course.id, 'maxStudents', e.target.value)}
                          className="bg-card border-ink text-ink mt-1"
                          placeholder="15"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-card rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <Checkbox
                          id={`prereq-${course.id}`}
                          checked={course.requiresPrerequisites}
                          onCheckedChange={(checked) =>
                            updateCourse(course.id, 'requiresPrerequisites', checked)
                          }
                        />
                        <label htmlFor={`prereq-${course.id}`} className="text-ink-2 cursor-pointer">
                          Ce cours nécessite des prérequis
                        </label>
                      </div>
                      {course.requiresPrerequisites && (
                        <Textarea
                          value={course.prerequisites}
                          onChange={(e) => updateCourse(course.id, 'prerequisites', e.target.value)}
                          className="bg-background border-ink text-ink"
                          placeholder="Liste des prérequis nécessaires..."
                          rows={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addCourse}
                className="w-full border-gold/50 text-gold hover:bg-gold/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un cours
              </Button>

            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-lime" />
                Confirmation
              </CardTitle>
              <CardDescription className="text-mute">
                Vérifiez les informations avant de soumettre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="p-4 bg-background rounded-lg">
                <h4 className="text-ink font-semibold mb-3">Centre de formation</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-ink-2"><span className="text-mute">Nom:</span> {companyName}</p>
                  <p className="text-ink-2"><span className="text-mute">Adresse:</span> {address}, {city}</p>
                  <p className="text-ink-2"><span className="text-mute">Email:</span> {email}</p>
                  <p className="text-ink-2"><span className="text-mute">Téléphone:</span> {phone}</p>
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg">
                <h4 className="text-ink font-semibold mb-3">Domaines d'expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map(type => (
                    <span key={type} className="px-3 py-1 bg-gold/20 border border-gold/30 text-gold rounded text-sm">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg">
                <h4 className="text-ink font-semibold mb-3">Cours proposés ({courses.length})</h4>
                <div className="space-y-1">
                  {courses.map((course, idx) => (
                    <p key={course.id} className="text-sm text-ink-2">
                      {idx + 1}. {course.courseName || 'Sans nom'} - {course.duration} {
                        course.durationUnit === 'hours' ? 'heures' :
                        course.durationUnit === 'weeks' ? 'semaines' : 'mois'
                      } - {course.basePrice} DH
                    </p>
                  ))}
                </div>
              </div>

              {(offersOnlineLearning || offersCertificates) && (
                <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg">
                  <div className="space-y-1 text-sm">
                    {offersOnlineLearning && (
                      <p className="text-gold">✓ Cours en ligne disponibles</p>
                    )}
                    {offersCertificates && (
                      <p className="text-gold">✓ Délivrance de certificats</p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-teal/10 border border-teal/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
                  <label htmlFor="terms" className="text-sm text-ink-2 cursor-pointer">
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
          className="border-ink text-ink-2 hover:bg-card"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Retour' : 'Précédent'}
        </Button>

        {currentStep < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!validateStep(currentStep)}
            className="bg-gold hover:bg-gold text-ink"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !accepted}
            className="bg-lime hover:bg-lime text-ink"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, X, Check, AlertCircle, Loader2 } from "lucide-react"
import { getSchools, getInterests, createTeen, checkPseudoAvailable, type TeenProfile } from "@/features/teens"
import { toast } from "sonner"

type School = { id: string; name: string; city: string }
type Interest = { id: string; name: string; category: string; icon_name: string | null }

export default function AjouterEnfantPage() {
  const router = useRouter()

  // États formulaire
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [pseudo, setPseudo] = useState("")
  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null)
  const [checkingPseudo, setCheckingPseudo] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("")
  const [school, setSchool] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [selectedProfiles, setSelectedProfiles] = useState<TeenProfile[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [allergies, setAllergies] = useState("")
  const [photoConsent, setPhotoConsent] = useState(false)
  const [exitPermissionRules, setExitPermissionRules] = useState("")
  const [emergencyContactName, setEmergencyContactName] = useState("")
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("")
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")

  // Référentiels
  const [schools, setSchools] = useState<School[]>([])
  const [interests, setInterests] = useState<Interest[]>([])

  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger référentiels
  useEffect(() => {
    const loadData = async () => {
      const [schoolsRes, interestsRes] = await Promise.all([
        getSchools(),
        getInterests()
      ])

      if (schoolsRes.success && schoolsRes.data) {
        setSchools(schoolsRes.data)
      }
      if (interestsRes.success && interestsRes.data) {
        setInterests(interestsRes.data)
      }
    }
    loadData()
  }, [])

  // Vérifier pseudo en temps réel
  useEffect(() => {
    if (!pseudo || pseudo.length < 3) {
      setPseudoAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingPseudo(true)
      const result = await checkPseudoAvailable(pseudo)
      if (result.success) {
        setPseudoAvailable(result.data.available)
      } else {
        setPseudoAvailable(null)
      }
      setCheckingPseudo(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pseudo])

  // Upload avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Toggle profil
  const toggleProfile = (profile: TeenProfile) => {
    if (selectedProfiles.includes(profile)) {
      setSelectedProfiles(selectedProfiles.filter(p => p !== profile))
    } else {
      if (selectedProfiles.length >= 2) {
        toast.error("Maximum 2 profils autorisés")
        return
      }
      setSelectedProfiles([...selectedProfiles, profile])
    }
  }

  // Toggle intérêt
  const toggleInterest = (interestName: string) => {
    if (selectedInterests.includes(interestName)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interestName))
    } else {
      setSelectedInterests([...selectedInterests, interestName])
    }
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validation
      if (!pseudoAvailable) {
        throw new Error("Le pseudo n'est pas disponible")
      }

      // Créer l'enfant
      const result = await createTeen({
        first_name: firstName,
        last_name: lastName,
        pseudo,
        date_of_birth: dateOfBirth,
        gender: gender || undefined,
        school: school || undefined,
        grade_level: gradeLevel || undefined,
        profiles: selectedProfiles,
        interests: selectedInterests,
        allergies: allergies || undefined,
        photo_consent: photoConsent,
        exit_permission_rules: exitPermissionRules || undefined,
        emergency_contact_name: emergencyContactName || undefined,
        emergency_contact_phone: emergencyContactPhone || undefined,
        emergency_contact_relation: emergencyContactRelation || undefined,
      })

      if (result.success === false) {
        throw new Error(result.error)
      }

      // TODO: Upload avatar si fichier présent
      // if (avatarFile && result.data) {
      //   await uploadTeenAvatar(avatarFile, result.data.id)
      // }

      toast.success("Enfant ajouté avec succès !")
      router.push("/profile/enfants")
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const profiles: { value: TeenProfile; label: string; icon: string }[] = [
    { value: "School", label: "School", icon: "📚" },
    { value: "Sport", label: "Sport", icon: "⚽" },
    { value: "Créa", label: "Créa", icon: "🎨" },
  ]

  const gradeLevels = [
    "6ème", "5ème", "4ème", "3ème",
    "2nde", "1ère", "Terminale"
  ]

  const interestsByCategory = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) acc[interest.category] = []
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  return (
    <div className="min-h-screen bg-background py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/profile/enfants">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Ajouter un enfant</CardTitle>
              <CardDescription>
                Créez le profil de votre ado avec pseudo, avatar et centres d'intérêt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* SECTION 1: IDENTITÉ */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Identité</h3>

                  {/* Avatar */}
                  <div>
                    <Label>Avatar (optionnel)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <Image src={avatarPreview} alt="Avatar" fill sizes="96px" className="object-cover" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Choisir une image
                            </span>
                          </Button>
                        </Label>
                        {avatarFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAvatarFile(null)
                              setAvatarPreview("")
                            }}
                            className="ml-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pseudo */}
                  <div>
                    <Label htmlFor="pseudo">Pseudo (public) *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="pseudo"
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value)}
                        placeholder="Ex: gamer2010, sportif_casa..."
                        required
                        minLength={3}
                        maxLength={20}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingPseudo && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {!checkingPseudo && pseudoAvailable === true && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {!checkingPseudo && pseudoAvailable === false && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {pseudoAvailable === false && (
                      <p className="text-sm text-red-500 mt-1">Ce pseudo est déjà pris</p>
                    )}
                    {pseudoAvailable === true && (
                      <p className="text-sm text-green-500 mt-1">Pseudo disponible !</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Le pseudo sera visible publiquement (jamais le nom/prénom)
                    </p>
                  </div>

                  {/* Nom & Prénom */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Date naissance & Genre */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date de naissance *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Genre</Label>
                      <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Garçon</SelectItem>
                          <SelectItem value="female">Fille</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: SCOLARITÉ */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Scolarité</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="school">École</Label>
                      <Select value={school} onValueChange={setSchool}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une école" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="gradeLevel">Classe / Niveau</Label>
                      <Select value={gradeLevel} onValueChange={setGradeLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: PROFILS (max 2) */}
                <div className="space-y-4">
                  <div>
                    <Label>Profils (max 2)</Label>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez jusqu'à 2 profils qui correspondent à votre ado
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {profiles.map((profile) => (
                      <Button
                        key={profile.value}
                        type="button"
                        variant={selectedProfiles.includes(profile.value) ? "default" : "outline"}
                        onClick={() => toggleProfile(profile.value)}
                        className="flex-1"
                      >
                        <span className="mr-2">{profile.icon}</span>
                        {profile.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* SECTION 4: CENTRES D'INTÉRÊT */}
                <div className="space-y-4">
                  <div>
                    <Label>Centres d'intérêt</Label>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez les centres d'intérêt de votre ado
                    </p>
                  </div>
                  {Object.entries(interestsByCategory).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-sm font-medium mb-2 capitalize">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((interest) => (
                          <Badge
                            key={interest.id}
                            variant={selectedInterests.includes(interest.name) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleInterest(interest.name)}
                          >
                            {interest.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SECTION 5: SANTÉ & SÉCURITÉ */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Santé & Sécurité</h3>

                  <div>
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Ex: Arachides, lactose..."
                      rows={2}
                    />
                  </div>

                  {/* Autorisations */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="photoConsent">Autorisation photo</Label>
                      <p className="text-sm text-muted-foreground">
                        Autorisez-vous la prise de photos lors des événements ?
                      </p>
                    </div>
                    <Switch
                      id="photoConsent"
                      checked={photoConsent}
                      onCheckedChange={setPhotoConsent}
                    />
                  </div>

                  <div>
                    <Label htmlFor="exitPermission">Règles de sortie</Label>
                    <Textarea
                      id="exitPermission"
                      value={exitPermissionRules}
                      onChange={(e) => setExitPermissionRules(e.target.value)}
                      placeholder="Ex: Peut sortir seul(e), doit être accompagné(e)..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* SECTION 6: CONTACT D'URGENCE */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact d'urgence</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyName">Nom</Label>
                      <Input
                        id="emergencyName"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Téléphone</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="+212 6XX XXX XXX"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="emergencyRelation">Lien de parenté</Label>
                    <Input
                      id="emergencyRelation"
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      placeholder="Ex: Grand-mère, Oncle, Voisin..."
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || !pseudoAvailable}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    "Créer le profil"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

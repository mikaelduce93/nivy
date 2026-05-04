"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  Search,
  UserCheck,
  AlertCircle,
  Check,
  UserPlus,
  Sparkles,
  Calendar,
  Star,
  Upload,
  Camera,
  X,
  GraduationCap,
  Heart,
  Phone,
  Shield,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { checkPseudoAvailable, getSchools, getInterests } from "@/features/teens"
import Image from "next/image"

interface AddTeenFormProps {
  parentId: string
}

// Emoji avatars for teens
const avatarOptions = [
  "🦁", "🐯", "🦊", "🐺", "🐱", "🐶", "🦄", "🐉",
  "🦋", "🐬", "🦅", "🐼", "🦜", "🐨", "🦖", "🐙",
  "🎮", "⚽", "🎨", "🎵", "📚", "🎬", "🏀", "🎭"
]

// Profile types (max 2)
const profileTypes = [
  { id: "School", label: "School", icon: "📚", description: "Axé études" },
  { id: "Sport", label: "Sport", icon: "⚽", description: "Sportif" },
  { id: "Créa", label: "Créa", icon: "🎨", description: "Créatif" }
] as const

// Emergency contact relation options
const relationOptions = [
  "Grand-parent",
  "Oncle/Tante",
  "Cousin/Cousine",
  "Ami(e) de la famille",
  "Voisin(e)",
  "Autre"
]

interface School {
  id: string
  name: string
  city?: string
}

interface Interest {
  id: string
  name: string
  category: string
  icon?: string
}

export function AddTeenForm({ parentId }: AddTeenFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search existing teen states
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [foundTeen, setFoundTeen] = useState<any>(null)
  const [error, setError] = useState("")

  // Referential data
  const [schools, setSchools] = useState<School[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [loadingReferentials, setLoadingReferentials] = useState(true)

  // Create new teen states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newTeen, setNewTeen] = useState({
    firstName: "",
    lastName: "",
    pseudo: "",
    dateOfBirth: "",
    avatar: "🦁",
    avatarUrl: null as string | null,
    avatarFile: null as File | null,
    school: "",
    gradeLevel: "",
    profiles: [] as string[],
    interests: [] as string[],
    allergies: "",
    photoConsent: false,
    exitRules: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: ""
  })

  // UI states
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false)
  const [schoolSearch, setSchoolSearch] = useState("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Pseudo validation states
  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null)
  const [checkingPseudo, setCheckingPseudo] = useState(false)

  // Load referential data
  useEffect(() => {
    async function loadReferentials() {
      setLoadingReferentials(true)
      try {
        const [schoolsResult, interestsResult] = await Promise.all([
          getSchools(),
          getInterests()
        ])

        if (schoolsResult.success) {
          setSchools(schoolsResult.data)
        }
        if (interestsResult.success) {
          setInterests(interestsResult.data)
        }
      } catch (err) {
        console.error("Failed to load referentials:", err)
      }
      setLoadingReferentials(false)
    }
    loadReferentials()
  }, [])

  // Debounced pseudo check
  useEffect(() => {
    if (!newTeen.pseudo || newTeen.pseudo.length < 3) {
      setPseudoAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingPseudo(true)
      try {
        const result = await checkPseudoAvailable(newTeen.pseudo)
        if (result.success) {
          setPseudoAvailable(result.data.available)
        } else {
          setPseudoAvailable(null)
        }
      } catch (err) {
        setPseudoAvailable(null)
      }
      setCheckingPseudo(false)
    }, 300) // 300ms debounce as specified

    return () => clearTimeout(timer)
  }, [newTeen.pseudo])

  // Calculate age from date of birth
  const calculateAge = (dateString: string) => {
    if (!dateString) return null
    const today = new Date()
    const birthDate = new Date(dateString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(newTeen.dateOfBirth)
  const isAgeValid = age !== null && age >= 10 && age <= 18

  // Filter schools based on search
  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    (school.city && school.city.toLowerCase().includes(schoolSearch.toLowerCase()))
  )

  // Group interests by category
  const interestsByCategory = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = []
    }
    acc[interest.category].push(interest)
    return acc
  }, {} as Record<string, Interest[]>)

  // Handle avatar upload with compression
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB")
      return
    }

    setUploadingAvatar(true)

    try {
      // Compress image using canvas
      const compressedFile = await compressImage(file, 400, 0.8)

      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile)

      setNewTeen(prev => ({
        ...prev,
        avatarFile: compressedFile,
        avatarUrl: previewUrl,
        avatar: "" // Clear emoji avatar when using photo
      }))
    } catch (err) {
      toast.error("Erreur lors du traitement de l'image")
    }

    setUploadingAvatar(false)
  }

  // Compress image function
  const compressImage = (file: File, maxSize: number, quality: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new window.Image()

      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }))
            } else {
              reject(new Error("Failed to compress image"))
            }
          },
          "image/jpeg",
          quality
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }

  // Remove uploaded avatar
  const removeAvatar = () => {
    if (newTeen.avatarUrl) {
      URL.revokeObjectURL(newTeen.avatarUrl)
    }
    setNewTeen(prev => ({
      ...prev,
      avatarFile: null,
      avatarUrl: null,
      avatar: "🦁"
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Toggle profile selection (max 2)
  const toggleProfile = (profileId: string) => {
    setNewTeen(prev => {
      const current = prev.profiles
      if (current.includes(profileId)) {
        return { ...prev, profiles: current.filter(p => p !== profileId) }
      }
      if (current.length >= 2) {
        toast.error("Maximum 2 profils autorisés")
        return prev
      }
      return { ...prev, profiles: [...current, profileId] }
    })
  }

  // Toggle interest selection
  const toggleInterest = (interestId: string) => {
    setNewTeen(prev => {
      const current = prev.interests
      if (current.includes(interestId)) {
        return { ...prev, interests: current.filter(i => i !== interestId) }
      }
      return { ...prev, interests: [...current, interestId] }
    })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Veuillez entrer un email ou un code")
      return
    }

    setSearchLoading(true)
    setError("")
    setFoundTeen(null)

    try {
      const response = await fetch(`/api/parent/teens/search?query=${encodeURIComponent(searchQuery)}`)
      const result = await response.json()

      if (result.success && result.data) {
        setFoundTeen(result.data)
      } else {
        setError(result.error || "Aucun teen trouvé avec cet identifiant")
      }
    } catch (err) {
      setError("Erreur lors de la recherche")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleLink = async () => {
    if (!foundTeen) return

    setLoading(true)
    try {
      const response = await fetch("/api/parent/teens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          teenId: foundTeen.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Demande de liaison envoyée")
        router.push("/parent/teens")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la liaison")
      }
    } catch (err) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeen = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (!newTeen.firstName.trim() || !newTeen.lastName.trim()) {
      toast.error("Le prénom et le nom sont requis")
      return
    }

    if (!pseudoAvailable) {
      toast.error("Le pseudo n'est pas disponible")
      return
    }

    if (!isAgeValid) {
      toast.error("L'âge doit être entre 10 et 18 ans")
      return
    }

    // Validate phone format if provided
    if (newTeen.emergencyContactPhone && !/^(\+212|0)[5-7]\d{8}$/.test(newTeen.emergencyContactPhone)) {
      toast.error("Format de téléphone invalide (ex: 0612345678)")
      return
    }

    setCreateLoading(true)

    try {
      // Upload avatar file if present
      let avatarUrl = null
      if (newTeen.avatarFile) {
        const formData = new FormData()
        formData.append("file", newTeen.avatarFile)

        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData
        })

        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json()
          avatarUrl = uploadResult.url
        }
      }

      const response = await fetch("/api/parent/teens/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          firstName: newTeen.firstName.trim(),
          lastName: newTeen.lastName.trim(),
          pseudo: newTeen.pseudo.trim(),
          dateOfBirth: newTeen.dateOfBirth,
          avatar: newTeen.avatar || "🦁",
          avatarUrl,
          school: newTeen.school,
          gradeLevel: newTeen.gradeLevel,
          profiles: newTeen.profiles,
          interests: newTeen.interests,
          allergies: newTeen.allergies,
          photoConsent: newTeen.photoConsent,
          exitRules: newTeen.exitRules,
          emergencyContactName: newTeen.emergencyContactName,
          emergencyContactPhone: newTeen.emergencyContactPhone,
          emergencyContactRelation: newTeen.emergencyContactRelation
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Compte Teen créé avec succès !")
        router.push("/parent/teens")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la création")
      }
    } catch (err) {
      toast.error("Une erreur est survenue")
    } finally {
      setCreateLoading(false)
    }
  }

  const updateNewTeen = (field: string, value: any) => {
    setNewTeen(prev => ({ ...prev, [field]: value }))
  }

  // Check if form is valid for submit
  const isCreateFormValid =
    newTeen.firstName.trim() &&
    newTeen.lastName.trim() &&
    newTeen.pseudo.length >= 3 &&
    pseudoAvailable === true &&
    isAgeValid

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Email ou Code du Teen</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setError("")
              setFoundTeen(null)
            }}
            placeholder="exemple@email.com ou CODE123"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            onClick={handleSearch}
            disabled={searchLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {searchLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          Le teen peut trouver son code dans ses paramètres de compte
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Found Teen */}
      {foundTeen && (
        <div className="p-6 bg-zinc-800 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl">
              {foundTeen.avatar || foundTeen.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{foundTeen.full_name}</h3>
              <p className="text-sm text-zinc-400">{foundTeen.email}</p>
              {foundTeen.username && (
                <p className="text-xs text-emerald-400">@{foundTeen.username}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg mb-4">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">Compte Teen vérifié</span>
          </div>

          <Button
            onClick={handleLink}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Envoyer la demande de liaison
              </>
            )}
          </Button>

          <p className="text-xs text-zinc-500 text-center mt-3">
            Le teen devra accepter cette demande depuis son compte
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-900 px-2 text-zinc-500">ou créer un nouveau compte</span>
        </div>
      </div>

      {/* Create New Teen Account */}
      {!showCreateForm ? (
        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <p className="text-sm text-zinc-400 mb-3">
            Votre teen n'a pas encore de compte ? Créez-en un pour lui.
          </p>
          <Button
            variant="outline"
            className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowCreateForm(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Créer un compte Teen
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCreateTeen} className="space-y-6 p-6 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Nouveau compte Teen</h3>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo de profil
            </Label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="relative">
                {newTeen.avatarUrl ? (
                  <div className="relative h-20 w-20 rounded-full overflow-hidden">
                    <Image
                      src={newTeen.avatarUrl}
                      alt="Avatar preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl">
                    {newTeen.avatar}
                  </div>
                )}
              </div>

              {/* Upload button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="w-full border-zinc-600 text-zinc-300"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {newTeen.avatarUrl ? "Changer la photo" : "Télécharger une photo"}
                </Button>
                <p className="text-xs text-zinc-500 mt-1">JPG, PNG. Max 5MB. Optionnel.</p>
              </div>
            </div>
          </div>

          {/* Avatar Emoji Selection (shown if no photo) */}
          {!newTeen.avatarUrl && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Ou choisir un avatar</Label>
              <div className="grid grid-cols-8 gap-2">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateNewTeen("avatar", emoji)}
                    className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      newTeen.avatar === emoji
                        ? "bg-emerald-500/30 border-2 border-emerald-500 scale-110"
                        : "bg-zinc-700 border border-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Prénom *</Label>
              <Input
                value={newTeen.firstName}
                onChange={(e) => updateNewTeen("firstName", e.target.value)}
                placeholder="Prénom"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Nom *</Label>
              <Input
                value={newTeen.lastName}
                onChange={(e) => updateNewTeen("lastName", e.target.value)}
                placeholder="Nom"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                required
              />
            </div>
          </div>

          {/* Pseudo with async validation */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Pseudo (public) *</Label>
            <div className="relative">
              <Input
                value={newTeen.pseudo}
                onChange={(e) => updateNewTeen("pseudo", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="ex: gamer2010, sportif_casa"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                minLength={3}
                maxLength={20}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingPseudo && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                {!checkingPseudo && pseudoAvailable === true && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
                {!checkingPseudo && pseudoAvailable === false && (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            {pseudoAvailable === true && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Pseudo disponible
              </p>
            )}
            {pseudoAvailable === false && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pseudo déjà pris
              </p>
            )}
            <p className="text-xs text-zinc-500">
              3-20 caractères, lettres, chiffres et underscore uniquement
            </p>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Date de naissance *</Label>
            <div className="relative">
              <Input
                type="date"
                value={newTeen.dateOfBirth}
                onChange={(e) => updateNewTeen("dateOfBirth", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split("T")[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                required
              />
            </div>
            {age !== null && (
              <p className={`text-xs ${isAgeValid ? "text-emerald-400" : "text-red-400"}`}>
                {isAgeValid ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" /> {age} ans
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> L'âge doit être entre 10 et 18 ans
                  </span>
                )}
              </p>
            )}
          </div>

          {/* School Selector with Search */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              École
            </Label>
            <div className="relative">
              <Input
                value={schoolSearch || newTeen.school}
                onChange={(e) => {
                  setSchoolSearch(e.target.value)
                  setShowSchoolDropdown(true)
                }}
                onFocus={() => setShowSchoolDropdown(true)}
                placeholder="Rechercher une école..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />

              {showSchoolDropdown && filteredSchools.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredSchools.slice(0, 10).map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => {
                        updateNewTeen("school", school.name)
                        setSchoolSearch("")
                        setShowSchoolDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span>{school.name}</span>
                      {school.city && <span className="text-xs text-zinc-500">{school.city}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grade Level */}
            <select
              value={newTeen.gradeLevel}
              onChange={(e) => updateNewTeen("gradeLevel", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm mt-2"
            >
              <option value="">Niveau scolaire</option>
              <option value="6eme">6ème</option>
              <option value="5eme">5ème</option>
              <option value="4eme">4ème</option>
              <option value="3eme">3ème</option>
              <option value="2nde">2nde</option>
              <option value="1ere">1ère</option>
              <option value="Terminale">Terminale</option>
            </select>
          </div>

          {/* Profiles Multi-select (max 2) */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Profils (max 2)
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {profileTypes.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleProfile(profile.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    newTeen.profiles.includes(profile.id)
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-2xl block mb-1">{profile.icon}</span>
                  <span className="text-sm font-medium">{profile.label}</span>
                  <span className="text-xs block text-zinc-500">{profile.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interests Multi-select */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Centres d'intérêt
            </Label>
            {loadingReferentials ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : Object.keys(interestsByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(interestsByCategory).map(([category, categoryInterests]) => (
                  <div key={category}>
                    <p className="text-xs text-zinc-500 mb-2">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryInterests.map((interest) => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            newTeen.interests.includes(interest.id)
                              ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                              : "bg-zinc-700 border border-zinc-600 text-zinc-300 hover:border-zinc-500"
                          }`}
                        >
                          {interest.icon && <span className="mr-1">{interest.icon}</span>}
                          {interest.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Aucun centre d'intérêt disponible</p>
            )}
          </div>

          {/* Photo Consent Switch */}
          <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <Camera className="h-5 w-5 text-zinc-400 mt-0.5" />
              <div>
                <Label className="text-white font-medium">Consentement photo</Label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  J'autorise la prise de photos de mon enfant lors des événements
                </p>
              </div>
            </div>
            <Switch
              checked={newTeen.photoConsent}
              onCheckedChange={(checked) => updateNewTeen("photoConsent", checked)}
            />
          </div>

          {/* Exit Permission Rules */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Règles de sortie
            </Label>
            <Textarea
              value={newTeen.exitRules}
              onChange={(e) => updateNewTeen("exitRules", e.target.value)}
              placeholder="Ex: Peut partir seul(e) après 18h / Doit être accompagné(e) par un adulte..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-zinc-500">
              Instructions spéciales pour la sortie de l'enfant
            </p>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-400" />
              <Label className="text-white font-medium">Contact d'urgence (optionnel)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Nom</Label>
                <Input
                  value={newTeen.emergencyContactName}
                  onChange={(e) => updateNewTeen("emergencyContactName", e.target.value)}
                  placeholder="Nom du contact"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Relation</Label>
                <select
                  value={newTeen.emergencyContactRelation}
                  onChange={(e) => updateNewTeen("emergencyContactRelation", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner...</option>
                  {relationOptions.map((relation) => (
                    <option key={relation} value={relation}>{relation}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Téléphone</Label>
              <Input
                value={newTeen.emergencyContactPhone}
                onChange={(e) => updateNewTeen("emergencyContactPhone", e.target.value)}
                placeholder="0612345678"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500">Format: 0612345678 ou +212612345678</p>
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Allergies ou informations médicales</Label>
            <Textarea
              value={newTeen.allergies}
              onChange={(e) => updateNewTeen("allergies", e.target.value)}
              placeholder="Mentionnez les allergies alimentaires, médicamenteuses ou autres informations importantes..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[60px]"
              maxLength={500}
            />
          </div>

          {/* Preview Card */}
          {(newTeen.pseudo || newTeen.firstName) && (
            <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-xs text-zinc-400 mb-3 flex items-center gap-1">
                <Star className="h-3 w-3" /> Aperçu de la carte Teen
              </p>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl overflow-hidden">
                  {newTeen.avatarUrl ? (
                    <Image
                      src={newTeen.avatarUrl}
                      alt="Avatar"
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    newTeen.avatar
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">
                    {newTeen.firstName || "Prénom"} {newTeen.lastName || "Nom"}
                  </p>
                  <p className="text-sm text-emerald-400">
                    @{newTeen.pseudo || "pseudo"}
                  </p>
                  {age && isAgeValid && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {age} ans
                      {newTeen.school && <span> • {newTeen.school}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  Niveau 1
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                  0 XP
                </span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  0 Coins
                </span>
                {newTeen.profiles.map((p) => (
                  <span key={p} className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs rounded-full">
                    {profileTypes.find(pt => pt.id === p)?.icon} {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300"
              onClick={() => setShowCreateForm(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createLoading || !isCreateFormValid}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
            >
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer le compte
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

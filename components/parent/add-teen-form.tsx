"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldInput } from "@/components/ui/field-input"
import { CheckRound } from "@/components/ui/check-round"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import {
  Loader2,
  Search,
  UserCheck,
  AlertCircle,
  UserPlus,
  Sparkles,
  Calendar,
  Star,
  Upload,
  Camera,
  X,
  Heart,
  Phone,
  Shield
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { checkPseudoAvailable, getInterests } from "@/features/teens"
import Image from "next/image"
import { isTeenAge, TEEN_AGE_ERROR, teenDateOfBirthBounds } from "@/lib/constants/age"

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

// #48 — Normalize a teen phone to E.164 (server requires E164_RE on auth.users).
// Accepts an already-E.164 value (+CC…) or a Moroccan local number (0[5-7]XXXXXXXX
// → +212XXXXXXXXX). Returns null when the input can't be normalized.
function normalizeTeenPhoneE164(raw: string): string | null {
  const t = raw.replace(/[\s.\-()]/g, "")
  if (!t) return null
  if (/^\+[1-9]\d{7,14}$/.test(t)) return t
  if (/^0[5-7]\d{8}$/.test(t)) return "+212" + t.slice(1)
  return null
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
  const [interests, setInterests] = useState<Interest[]>([])
  const [loadingReferentials, setLoadingReferentials] = useState(true)

  // Create new teen states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newTeen, setNewTeen] = useState({
    firstName: "",
    lastName: "",
    pseudo: "",
    teenEmail: "",
    teenPhone: "",
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Pseudo validation states
  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null)
  const [checkingPseudo, setCheckingPseudo] = useState(false)

  // Load referential data
  useEffect(() => {
    async function loadReferentials() {
      setLoadingReferentials(true)
      try {
        const interestsResult = await getInterests()
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
  const isAgeValid = age !== null && isTeenAge(age)
  const dobBounds = teenDateOfBirthBounds()

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
      toast.error(TEEN_AGE_ERROR)
      return
    }

    // Validate phone format if provided
    if (newTeen.emergencyContactPhone && !/^(\+212|0)[5-7]\d{8}$/.test(newTeen.emergencyContactPhone)) {
      toast.error("Format de téléphone invalide (ex: 0612345678)")
      return
    }

    // #48 — the teen account is created on auth.users, which needs an email
    // and/or phone. The server requires at least one (Zod .refine) and the
    // phone in E.164. Validate + normalize here so we never send a 400-bound
    // payload.
    const teenEmail = newTeen.teenEmail.trim()
    const teenPhoneE164 = normalizeTeenPhoneE164(newTeen.teenPhone)
    if (!teenEmail && !newTeen.teenPhone.trim()) {
      toast.error("Renseigne l'email ou le téléphone du teen (au moins l'un des deux)")
      return
    }
    if (teenEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teenEmail)) {
      toast.error("Format d'email du teen invalide")
      return
    }
    if (newTeen.teenPhone.trim() && !teenPhoneE164) {
      toast.error("Téléphone du teen invalide (format attendu : +212XXXXXXXXX ou 06XXXXXXXX)")
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
          // #48 — send null (not "") for unselected optionals: school maps to
          // teens.school_type which has a CHECK constraint that "" violates.
          school: newTeen.school || null,
          gradeLevel: newTeen.gradeLevel || null,
          profiles: newTeen.profiles,
          interests: newTeen.interests,
          allergies: newTeen.allergies,
          photoConsent: newTeen.photoConsent,
          exitRules: newTeen.exitRules,
          emergencyContactName: newTeen.emergencyContactName,
          // #48 — emergencyContactPhone is .regex(PHONE_MA_RE).optional().nullable()
          // server-side: an empty string fails the regex (400). Send null when
          // blank so the optional emergency contact doesn't block teen creation.
          emergencyContactPhone: newTeen.emergencyContactPhone || null,
          emergencyContactRelation: newTeen.emergencyContactRelation,
          // #48 — only include keys when present (both .optional() server-side);
          // phone normalized to E.164 to satisfy the server's E164_RE.
          ...(teenEmail ? { teen_email: teenEmail } : {}),
          ...(teenPhoneE164 ? { teen_phone: teenPhoneE164 } : {}),
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
    isAgeValid &&
    // #48 — at least one of email/phone is required (mirrors server .refine)
    Boolean(newTeen.teenEmail.trim() || newTeen.teenPhone.trim())

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="space-y-2">
        <Label className="eyebrow tracking-[0.16em]">Email ou code du teen</Label>
        <div className="flex gap-2">
          <FieldInput
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setError("")
              setFoundTeen(null)
            }}
            placeholder="exemple@email.com ou CODE123"
            containerClassName="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            variant="pink"
            onClick={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-mute">
          Le teen trouve son code dans les paramètres de son compte.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Found Teen */}
      {foundTeen && (
        <div className="rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center font-display text-2xl font-extrabold text-ink">
              {foundTeen.avatar || foundTeen.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <h3 className="font-display text-xl font-extrabold text-ink">{foundTeen.full_name}</h3>
              <p className="text-sm text-mute">{foundTeen.email}</p>
              {foundTeen.username && (
                <p className="font-mono text-xs text-lime">@{foundTeen.username}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border-2 border-lime bg-lime/15 p-3 mb-4">
            <UserCheck className="h-5 w-5 text-lime" />
            <span className="text-sm font-medium text-ink-2">Compte teen vérifié</span>
          </div>

          <Button
            variant="pink"
            onClick={handleLink}
            disabled={loading}
            className="w-full"
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

          <p className="text-xs text-mute text-center mt-3">
            Le teen devra accepter cette demande depuis son compte.
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-line" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
            ou créer un nouveau compte
          </span>
        </div>
      </div>

      {/* Create New Teen Account */}
      {!showCreateForm ? (
        <div className="rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
          <p className="text-sm text-mute mb-3">
            Ton ado n'a pas encore de compte ? Crées-en un pour lui.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCreateForm(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Créer un compte teen
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCreateTeen} className="space-y-6 rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-lime" />
            <h3 className="font-display text-lg font-extrabold text-ink">Nouveau compte teen</h3>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="eyebrow tracking-[0.16em] flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo de profil
            </Label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="relative">
                {newTeen.avatarUrl ? (
                  <div className="relative h-20 w-20 rounded-2xl border-2 border-ink overflow-hidden">
                    <Image
                      src={newTeen.avatarUrl}
                      alt="Avatar preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-1 -right-1 h-6 w-6 bg-destructive rounded-full flex items-center justify-center border-2 border-ink"
                    >
                      <X className="h-3 w-3 text-ink" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center text-3xl">
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
                  className="w-full"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {newTeen.avatarUrl ? "Changer la photo" : "Télécharger une photo"}
                </Button>
                <p className="text-xs text-mute mt-1">JPG, PNG. Max 5MB. Optionnel.</p>
              </div>
            </div>
          </div>

          {/* Avatar Emoji Selection (shown if no photo) */}
          {!newTeen.avatarUrl && (
            <div className="space-y-2">
              <Label className="eyebrow tracking-[0.16em]">Ou choisir un avatar</Label>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateNewTeen("avatar", emoji)}
                    className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                      newTeen.avatar === emoji
                        ? "bg-lime/20 border-ink"
                        : "bg-paper-2 border-line hover:border-ink"
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
            <FieldInput
              label="Prénom *"
              value={newTeen.firstName}
              onChange={(e) => updateNewTeen("firstName", e.target.value)}
              placeholder="Prénom"
              required
            />
            <FieldInput
              label="Nom *"
              value={newTeen.lastName}
              onChange={(e) => updateNewTeen("lastName", e.target.value)}
              placeholder="Nom"
              required
            />
          </div>

          {/* Pseudo with async validation */}
          <div className="relative">
            <FieldInput
              label="Pseudo (public) *"
              value={newTeen.pseudo}
              onChange={(e) => updateNewTeen("pseudo", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="ex: gamer2010, sportif_casa"
              minLength={3}
              maxLength={20}
              required
              success={!checkingPseudo && pseudoAvailable === true}
              error={
                !checkingPseudo && pseudoAvailable === false
                  ? "Pseudo déjà pris"
                  : undefined
              }
              hint={
                checkingPseudo
                  ? "Vérification en cours…"
                  : pseudoAvailable === true
                    ? "Pseudo disponible"
                    : "3-20 caractères, lettres, chiffres et underscore uniquement"
              }
            />
            {checkingPseudo && (
              <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-mute" />
            )}
          </div>

          {/* #48 — Teen login identity: email and/or phone (at least one). */}
          <FieldInput
            label="Email du teen"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={newTeen.teenEmail}
            onChange={(e) => updateNewTeen("teenEmail", e.target.value)}
            placeholder="ex: amine@email.com"
          />

          <FieldInput
            label="Téléphone du teen"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={newTeen.teenPhone}
            onChange={(e) => updateNewTeen("teenPhone", e.target.value)}
            placeholder="ex: 0612345678 ou +212612345678"
            hint="Email ou téléphone requis (au moins l'un des deux). Le numéro est converti au format international (+212…) automatiquement."
          />

          {/* Date of Birth */}
          <FieldInput
            label="Date de naissance *"
            type="date"
            value={newTeen.dateOfBirth}
            onChange={(e) => updateNewTeen("dateOfBirth", e.target.value)}
            max={dobBounds.max}
            min={dobBounds.min}
            required
            success={age !== null && isAgeValid}
            error={age !== null && !isAgeValid ? "L'âge doit être entre 10 et 18 ans" : undefined}
            hint={age !== null && isAgeValid ? `${age} ans` : undefined}
          />

          {/* École — champ texte libre (#294 : aucune table `schools` réelle ;
              l'ancien sélecteur se vidait silencieusement). */}
          <div className="space-y-3">
            <FieldInput
              label="École"
              value={newTeen.school}
              onChange={(e) => updateNewTeen("school", e.target.value)}
              placeholder="Nom de l'établissement"
            />

            {/* Grade Level */}
            <SelectSticker
              label="Niveau scolaire"
              placeholder="Niveau scolaire"
              value={newTeen.gradeLevel || undefined}
              onValueChange={(value) => updateNewTeen("gradeLevel", value)}
            >
              <SelectStickerItem value="6eme">6ème</SelectStickerItem>
              <SelectStickerItem value="5eme">5ème</SelectStickerItem>
              <SelectStickerItem value="4eme">4ème</SelectStickerItem>
              <SelectStickerItem value="3eme">3ème</SelectStickerItem>
              <SelectStickerItem value="2nde">2nde</SelectStickerItem>
              <SelectStickerItem value="1ere">1ère</SelectStickerItem>
              <SelectStickerItem value="Terminale">Terminale</SelectStickerItem>
            </SelectSticker>
          </div>

          {/* Profiles Multi-select (max 2) */}
          <div className="space-y-2">
            <Label className="eyebrow tracking-[0.16em] flex items-center gap-2">
              <Star className="h-4 w-4" />
              Profils (max 2)
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {profileTypes.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleProfile(profile.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    newTeen.profiles.includes(profile.id)
                      ? "bg-lime/20 border-ink text-ink shadow-stkr-sm"
                      : "bg-white border-line text-ink-2 hover:border-ink"
                  }`}
                >
                  <span className="text-2xl block mb-1">{profile.icon}</span>
                  <span className="text-sm font-semibold">{profile.label}</span>
                  <span className="text-xs block text-mute">{profile.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interests Multi-select */}
          <div className="space-y-2">
            <Label className="eyebrow tracking-[0.16em] flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Centres d'intérêt
            </Label>
            {loadingReferentials ? (
              <div className="flex items-center gap-2 text-mute">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : Object.keys(interestsByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(interestsByCategory).map(([category, categoryInterests]) => (
                  <div key={category}>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-mute mb-2">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryInterests.map((interest) => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                            newTeen.interests.includes(interest.id)
                              ? "bg-lime/20 border-ink text-ink"
                              : "bg-white border-line text-ink-2 hover:border-ink"
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
              <p className="text-sm text-mute">Aucun centre d'intérêt disponible</p>
            )}
          </div>

          {/* Photo Consent */}
          <CheckRound
            checked={newTeen.photoConsent}
            onCheckedChange={(checked) => updateNewTeen("photoConsent", checked === true)}
            label={
              <span>
                <span className="block font-semibold text-ink">Consentement photo</span>
                <span className="block text-xs text-mute mt-0.5">
                  J'autorise la prise de photos de mon enfant lors des événements.
                </span>
              </span>
            }
          />

          {/* Exit Permission Rules */}
          <div className="space-y-2">
            <Label className="eyebrow tracking-[0.16em] flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Règles de sortie
            </Label>
            <Textarea
              value={newTeen.exitRules}
              onChange={(e) => updateNewTeen("exitRules", e.target.value)}
              placeholder="Ex: Peut partir seul(e) après 18h / Doit être accompagné(e) par un adulte..."
              className="bg-card border-2 border-input text-ink placeholder:text-mute min-h-[80px] focus-visible:border-ink focus-visible:ring-0"
              maxLength={500}
            />
            <p className="text-xs text-mute">
              Instructions spéciales pour la sortie de l'enfant.
            </p>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4 rounded-xl border-2 border-line bg-paper-2 p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gold" />
              <Label className="font-display text-sm font-extrabold text-ink">Contact d'urgence (optionnel)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="Nom"
                value={newTeen.emergencyContactName}
                onChange={(e) => updateNewTeen("emergencyContactName", e.target.value)}
                placeholder="Nom du contact"
              />
              <SelectSticker
                label="Relation"
                placeholder="Sélectionner..."
                value={newTeen.emergencyContactRelation || undefined}
                onValueChange={(value) => updateNewTeen("emergencyContactRelation", value)}
              >
                {relationOptions.map((relation) => (
                  <SelectStickerItem key={relation} value={relation}>{relation}</SelectStickerItem>
                ))}
              </SelectSticker>
            </div>

            <FieldInput
              label="Téléphone"
              value={newTeen.emergencyContactPhone}
              onChange={(e) => updateNewTeen("emergencyContactPhone", e.target.value)}
              placeholder="0612345678"
              hint="Format: 0612345678 ou +212612345678"
            />
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label className="eyebrow tracking-[0.16em]">Allergies ou informations médicales</Label>
            <Textarea
              value={newTeen.allergies}
              onChange={(e) => updateNewTeen("allergies", e.target.value)}
              placeholder="Mentionne les allergies alimentaires, médicamenteuses ou autres informations importantes..."
              className="bg-card border-2 border-input text-ink placeholder:text-mute min-h-[60px] focus-visible:border-ink focus-visible:ring-0"
              maxLength={500}
            />
          </div>

          {/* Preview Card */}
          {(newTeen.pseudo || newTeen.firstName) && (
            <div className="rounded-2xl border-2 border-ink bg-paper-2 p-4 shadow-stkr-sm">
              <p className="eyebrow tracking-[0.14em] text-mute mb-3 flex items-center gap-1">
                <Star className="h-3 w-3" /> Aperçu de la carte teen
              </p>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl border-2 border-ink bg-white flex items-center justify-center text-2xl overflow-hidden">
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
                  <p className="font-display font-extrabold text-ink">
                    {newTeen.firstName || "Prénom"} {newTeen.lastName || "Nom"}
                  </p>
                  <p className="font-mono text-sm text-lime">
                    @{newTeen.pseudo || "pseudo"}
                  </p>
                  {age && isAgeValid && (
                    <p className="text-xs text-mute flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {age} ans
                      {newTeen.school && <span> • {newTeen.school}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 border border-line text-teal text-xs font-mono rounded-full">
                  Niveau 1
                </span>
                <span className="px-2 py-1 border border-line text-gold text-xs font-mono rounded-full">
                  0 XP
                </span>
                <span className="px-2 py-1 border border-line text-coral text-xs font-mono rounded-full">
                  ⊙ 0 Coins
                </span>
                {newTeen.profiles.map((p) => (
                  <span key={p} className="px-2 py-1 border border-line text-ink-2 text-xs font-mono rounded-full">
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
              className="flex-1"
              onClick={() => setShowCreateForm(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={createLoading || !isCreateFormValid}
              className="flex-1 disabled:opacity-50"
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

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { Textarea } from "@/components/ui/textarea"
import { NivCoach } from "@/components/brand"
import { Loader2, Save, Camera } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ProfileEditFormProps {
  profileId: string
  initialData: {
    fullName: string
    username: string
    bio: string
    avatarUrl: string
  }
}

const avatarOptions = [
  "🦁", "🐯", "🦊", "🐺", "🐱", "🐶",
  "🦄", "🐉", "🦅", "🦋", "🐬", "🦈",
  "🎮", "🎸", "🎨", "🏀", "⚽", "🎯"
]

export function ProfileEditForm({ profileId, initialData }: ProfileEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: initialData.fullName,
    username: initialData.username,
    bio: initialData.bio,
    avatarEmoji: ""
  })
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName.trim()) {
      toast.error("Le nom est requis")
      return
    }

    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error("Le pseudo ne peut contenir que des lettres, chiffres et underscores")
      return
    }

    if (formData.bio.length > 200) {
      toast.error("La bio ne peut pas dépasser 200 caractères")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/teen/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          fullName: formData.fullName,
          username: formData.username || null,
          bio: formData.bio || null,
          avatarEmoji: formData.avatarEmoji || null
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Profil mis à jour !")
        router.push("/teen/profile")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour")
      }
    } catch (err) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Coach Niv */}
      <NivCoach
        mood="happy"
        message="Montre qui tu es à ton crew."
      />

      {/* Avatar Selection */}
      <div className="space-y-3">
        <span className="eyebrow tracking-[0.16em]">Avatar</span>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl border-2 border-ink bg-white flex items-center justify-center text-ink text-3xl font-extrabold">
            {formData.avatarEmoji || initialData.fullName?.charAt(0) || "?"}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Changer l&apos;avatar
          </Button>
        </div>

        {showAvatarPicker && (
          <div className="p-4 bg-white rounded-2xl border-2 border-ink shadow-stkr-sm">
            <p className="text-sm text-mute mb-3">Choisis un emoji comme avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleChange("avatarEmoji", emoji)
                    setShowAvatarPicker(false)
                  }}
                  className={cn(
                    "h-12 w-12 rounded-xl text-2xl flex items-center justify-center border-2 transition-all",
                    formData.avatarEmoji === emoji
                      ? "bg-pink/20 border-ink"
                      : "bg-paper border-transparent hover:border-ink"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Name */}
      <FieldInput
        label="Nom complet"
        type="text"
        value={formData.fullName}
        onChange={(e) => handleChange("fullName", e.target.value)}
        placeholder="Ton nom"
        maxLength={50}
      />

      {/* Username */}
      <FieldInput
        label="Pseudo (optionnel)"
        type="text"
        value={formData.username}
        onChange={(e) => handleChange("username", e.target.value.toLowerCase())}
        placeholder="ton_pseudo"
        maxLength={20}
        hint="Lettres, chiffres et underscores uniquement"
      />

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="profile-bio" className="eyebrow tracking-[0.16em]">Bio</label>
        <Textarea
          id="profile-bio"
          value={formData.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Parle un peu de toi..."
          className="bg-white border-2 border-ink text-ink placeholder:text-mute min-h-[100px] resize-none focus-visible:border-ink focus-visible:ring-0"
          maxLength={200}
        />
        <p className="font-mono text-xs text-mute text-right tabular-nums">
          {formData.bio.length}/200 caractères
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="pink"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

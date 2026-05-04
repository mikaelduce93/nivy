"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Camera, User, AtSign, FileText } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
      {/* Avatar Selection */}
      <div className="space-y-3">
        <Label className="text-zinc-300">Avatar</Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-3xl font-black">
            {formData.avatarEmoji || initialData.fullName?.charAt(0) || "?"}
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Changer l'avatar
          </Button>
        </div>

        {showAvatarPicker && (
          <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
            <p className="text-sm text-zinc-400 mb-3">Choisis un emoji comme avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleChange("avatarEmoji", emoji)
                    setShowAvatarPicker(false)
                  }}
                  className={`h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    formData.avatarEmoji === emoji
                      ? "bg-emerald-500/20 border-2 border-emerald-500"
                      : "bg-zinc-700 hover:bg-zinc-600 border-2 border-transparent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label className="text-zinc-300 flex items-center gap-2">
          <User className="h-4 w-4" />
          Nom complet
        </Label>
        <Input
          type="text"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="Ton nom"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          maxLength={50}
        />
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label className="text-zinc-300 flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Pseudo (optionnel)
        </Label>
        <Input
          type="text"
          value={formData.username}
          onChange={(e) => handleChange("username", e.target.value.toLowerCase())}
          placeholder="ton_pseudo"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          maxLength={20}
        />
        <p className="text-xs text-zinc-500">
          Lettres, chiffres et underscores uniquement
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label className="text-zinc-300 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Bio
        </Label>
        <Textarea
          value={formData.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Parle un peu de toi..."
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px] resize-none"
          maxLength={200}
        />
        <p className="text-xs text-zinc-500 text-right">
          {formData.bio.length}/200 caractères
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-zinc-700 text-zinc-300"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
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

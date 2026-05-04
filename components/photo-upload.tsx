"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Upload, X, Loader2, Camera } from 'lucide-react'
import { compressImageToBlob, validateImageFile } from "@/lib/utils/compress-image"

interface PhotoUploadProps {
  currentPhotoUrl?: string | null
  onPhotoChange: (url: string) => void
  childId?: string
  userId: string
  label?: string
}

export function PhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  childId,
  userId,
  label = "Photo de profil",
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file, 10) // 10 Mo max before compression
    if (!validation.valid) {
      setError(validation.error || "Fichier invalide")
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Compress image (max 1 Mo, max 1920px)
      const compressedBlob = await compressImageToBlob(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      })
      
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${childId || "profile"}-${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from("child-photos")
        .upload(fileName, compressedBlob, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from("child-photos")
        .getPublicUrl(fileName)

      const publicUrl = publicData.publicUrl

      setPreviewUrl(publicUrl)
      onPhotoChange(publicUrl)
    } catch (err: any) {
      console.error("[v0] Photo upload error:", err)
      setError(err.message || "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setPreviewUrl(null)
    onPhotoChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      <div className="flex items-center gap-4">
        {previewUrl ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700">
            <Image
              src={previewUrl || "/placeholder.svg"}
              alt="Aperçu"
              fill
              sizes="96px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={uploading}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Camera className="w-10 h-10 text-white" />
          </div>
        )}

        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-upload-${childId || "main"}`}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {previewUrl ? "Changer la photo" : "Ajouter une photo"}
              </>
            )}
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            JPG, PNG, WebP. Max 10 Mo. Compression automatique à 1 Mo.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

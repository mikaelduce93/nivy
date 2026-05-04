"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhotoUpload } from "@/components/photo-upload"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ModifierEnfantPage() {
  const params = useParams()
  const childId = params.id as string

  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [genre, setGenre] = useState("")
  const [allergies, setAllergies] = useState("")
  const [medicalInfo, setMedicalInfo] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [userId, setUserId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadChildData = async () => {
      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        }

        const { data: child, error } = await supabase.from("children").select("*").eq("id", childId).single()

        if (error) throw error

        if (child) {
          setPrenom(child.prenom || "")
          setNom(child.nom || "")
          setDateNaissance(child.date_naissance || "")
          setGenre(child.genre || "")
          setAllergies(child.allergies || "")
          setMedicalInfo(child.medical_info || "")
          setPhotoUrl(child.photo_url || "")
        }
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Erreur de chargement")
      } finally {
        setIsLoadingData(false)
      }
    }

    loadChildData()
  }, [childId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("children")
        .update({
          prenom,
          nom,
          date_naissance: dateNaissance,
          genre: genre || null,
          allergies: allergies || null,
          medical_info: medicalInfo || null,
          photo_url: photoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", childId)

      if (error) throw error

      router.push("/profile/enfants")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-zinc-950 py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-white text-center">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 text-cyan-400 hover:text-cyan-300">
            <Link href="/profile/enfants">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Modifier l'enfant</CardTitle>
              <CardDescription>Mettez à jour les informations de votre enfant</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  {userId && (
                    <PhotoUpload
                      currentPhotoUrl={photoUrl}
                      onPhotoChange={setPhotoUrl}
                      childId={childId}
                      userId={userId}
                      label="Photo de l'enfant"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        type="text"
                        placeholder="Prénom"
                        required
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        type="text"
                        placeholder="Nom"
                        required
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dateNaissance">Date de naissance *</Label>
                    <Input
                      id="dateNaissance"
                      type="date"
                      required
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="garcon">Garçon</SelectItem>
                        <SelectItem value="fille">Fille</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      placeholder="Liste des allergies (optionnel)"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="medicalInfo">Informations médicales</Label>
                    <Textarea
                      id="medicalInfo"
                      placeholder="Informations médicales importantes (optionnel)"
                      value={medicalInfo}
                      onChange={(e) => setMedicalInfo(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? "Mise à jour..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

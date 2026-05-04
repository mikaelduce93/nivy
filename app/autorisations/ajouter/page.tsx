"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AjouterAutorisationPage() {
  const [authorizedPersonName, setAuthorizedPersonName] = useState("")
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState("")
  const [authorizedPersonId, setAuthorizedPersonId] = useState("")
  const [relationship, setRelationship] = useState("")
  const [childId, setChildId] = useState("")
  const [notes, setNotes] = useState("")
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expiresAt, setExpiresAt] = useState("")
  const [children, setChildren] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from("children").select("*").eq("parent_id", user.id)

    setChildren(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const { error: insertError } = await supabase.from("child_authorizations").insert({
        parent_id: user.id,
        child_id: childId,
        authorized_person_name: authorizedPersonName,
        authorized_person_phone: authorizedPersonPhone,
        authorized_person_id: authorizedPersonId || null,
        relationship,
        notes: notes || null,
        expires_at: hasExpiration ? expiresAt : null,
        status: "active",
      })

      if (insertError) throw insertError

      router.push("/autorisations?added=true")
    } catch (error: any) {
      setError(error.message || "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 text-cyan-400 hover:text-cyan-300">
            <Link href="/autorisations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Nouvelle autorisation</CardTitle>
              <CardDescription>Autorisez une personne de confiance à récupérer votre enfant</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="child">Enfant concerné *</Label>
                  <Select value={childId} onValueChange={setChildId} required>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Sélectionner un enfant" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-400">Aucun enfant</div>
                      ) : (
                        children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.prenom} {child.nom}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet de la personne autorisée *</Label>
                  <Input
                    id="name"
                    value={authorizedPersonName}
                    onChange={(e) => setAuthorizedPersonName(e.target.value)}
                    placeholder="Ex: Marie Dubois"
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={authorizedPersonPhone}
                    onChange={(e) => setAuthorizedPersonPhone(e.target.value)}
                    placeholder="+212 6XX XX XX XX"
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">Numéro CIN (recommandé)</Label>
                  <Input
                    id="idNumber"
                    value={authorizedPersonId}
                    onChange={(e) => setAuthorizedPersonId(e.target.value)}
                    placeholder="CIN ou passeport"
                    className="bg-zinc-900 border-zinc-800"
                  />
                  <p className="text-xs text-zinc-500">Cette information sera vérifiée lors de la récupération</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Lien avec l'enfant *</Label>
                  <Select value={relationship} onValueChange={setRelationship} required>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grand-parent">Grand-parent</SelectItem>
                      <SelectItem value="oncle-tante">Oncle / Tante</SelectItem>
                      <SelectItem value="ami">Ami(e) de la famille</SelectItem>
                      <SelectItem value="voisin">Voisin(e)</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expiration"
                      checked={hasExpiration}
                      onCheckedChange={(checked) => setHasExpiration(checked as boolean)}
                    />
                    <Label htmlFor="expiration" className="cursor-pointer">
                      Définir une date d'expiration
                    </Label>
                  </div>

                  {hasExpiration && (
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Date d'expiration</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required={hasExpiration}
                        className="bg-zinc-900 border-zinc-800"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informations complémentaires..."
                    rows={3}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  disabled={isLoading || children.length === 0}
                >
                  {isLoading ? "Création..." : "Créer l'autorisation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

interface ClubEnrollmentFormProps {
  clubId: string
  clubName: string
  monthlyPrice: number
  clubSlug: string
  isLoggedIn: boolean
}

export default function ClubEnrollmentForm({
  clubId,
  clubName,
  monthlyPrice,
  clubSlug,
  isLoggedIn,
}: ClubEnrollmentFormProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedChild, setSelectedChild] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isLoggedIn) {
      loadChildren()
    }
  }, [isLoggedIn])

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
    setIsProcessing(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth/login?redirect=/clubs/${clubSlug}`)
        return
      }

      if (!selectedChild) {
        throw new Error("Veuillez sélectionner un enfant")
      }

      // Check if already enrolled
      const { data: existing } = await supabase
        .from("club_enrollments")
        .select("id")
        .eq("club_id", clubId)
        .eq("child_id", selectedChild)
        .eq("status", "active")
        .single()

      if (existing) {
        throw new Error("Cet enfant est déjà inscrit à ce club")
      }

      const { error: enrollmentError } = await supabase.from("club_enrollments").insert({
        club_id: clubId,
        child_id: selectedChild,
        parent_id: user.id,
        status: "active",
        enrollment_date: new Date().toISOString().split("T")[0],
      })

      if (enrollmentError) throw enrollmentError

      router.push(`/mes-clubs?enrolled=true`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <Button
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
        onClick={() => router.push(`/auth/login?redirect=/clubs/${clubSlug}`)}
      >
        <UserPlus className="w-5 h-5 mr-2" />
        Se connecter pour s'inscrire
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="child" className="text-white mb-2 block">
            Inscrire un enfant
          </Label>
          <p className="text-xs text-zinc-500 mb-2">
            Vous pouvez inscrire plusieurs enfants en remplissant ce formulaire plusieurs fois
          </p>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger id="child" className="bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Sélectionner un enfant" />
            </SelectTrigger>
            <SelectContent>
              {children.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-400">Aucun enfant ajouté</div>
              ) : (
                children.map((child) => {
                  const age = Math.floor(
                    (new Date().getTime() - new Date(child.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365),
                  )
                  return (
                    <SelectItem key={child.id} value={child.id}>
                      {child.prenom} {child.nom} ({age} ans)
                    </SelectItem>
                  )
                })
              )}
            </SelectContent>
          </Select>
          {children.length === 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              <Button
                type="button"
                variant="link"
                className="text-cyan-400 p-0 h-auto"
                onClick={() => router.push("/profile/enfants/ajouter")}
              >
                Ajouter un enfant
              </Button>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
        disabled={isProcessing || !selectedChild}
      >
        <UserPlus className="w-5 h-5 mr-2" />
        {isProcessing ? "Inscription..." : `S'inscrire - ${monthlyPrice} DH/mois`}
      </Button>

      <p className="text-center text-xs text-zinc-500 mt-4">Sans engagement • Résiliation possible à tout moment</p>
    </form>
  )
}

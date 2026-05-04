"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, CreditCard } from "lucide-react"
import QRCode from "qrcode"

interface Teen {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
}

interface ReservationFormProps {
  event: any
  ticketTypes: any[]
  selectedTickets: Record<string, number>
  teens: Teen[]
  profile: any
}

export default function ReservationForm({ event, ticketTypes, selectedTickets, teens, profile }: ReservationFormProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [teenAssignments, setTeenAssignments] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)
  const totalPrice = Object.entries(selectedTickets).reduce((sum, [ticketId, qty]) => {
    const ticket = ticketTypes.find((t) => t.id === ticketId)
    return sum + (ticket ? ticket.price * qty : 0)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const bookings = []

      for (const [ticketTypeId, quantity] of Object.entries(selectedTickets)) {
        for (let i = 0; i < quantity; i++) {
          const assignmentKey = `${ticketTypeId}-${i}`
          const teenId = teenAssignments[assignmentKey]

          if (!teenId) {
            throw new Error("Veuillez assigner tous les billets à un adolescent")
          }

          const ticket = ticketTypes.find((t) => t.id === ticketTypeId)
          if (!ticket) continue

          const qrData = `TEENSPARTY:${event.id}:${teenId}:${Date.now()}`
          const qrCode = await QRCode.toDataURL(qrData)

          bookings.push({
            parent_id: profile.id,
            event_id: event.id,
            ticket_type_id: ticketTypeId,
            teen_id: teenId,
            quantity: 1,
            total_price: ticket.price,
            status: "confirmed",
            payment_status: "paid",
            qr_code: qrCode,
          })
        }
      }

      const { data, error: bookingError } = await supabase.from("bookings").insert(bookings).select()

      if (bookingError) throw bookingError

      router.push(`/mes-reservations?success=true`)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setIsProcessing(false)
    }
  }

  const needsMoreTeens = totalTickets > teens.length

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-6">Détails de l'événement</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>
                  {new Date(event.event_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-sm mt-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>
                  {event.venues?.name}, {event.cities?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-6">Attribution des billets</h2>

          {needsMoreTeens && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                Vous devez ajouter {totalTickets - teens.length} adolescent(s) supplémentaire(s) dans votre profil pour
                compléter cette réservation.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-black border-0"
                onClick={() => router.push("/profile/teens/add")}
              >
                Ajouter un adolescent
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(selectedTickets).map(([ticketTypeId, quantity]) => {
              const ticket = ticketTypes.find((t) => t.id === ticketTypeId)
              if (!ticket) return null

              return Array.from({ length: quantity }).map((_, index) => {
                const assignmentKey = `${ticketTypeId}-${index}`

                return (
                  <div key={assignmentKey} className="border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-semibold">
                        {ticket.name} #{index + 1}
                      </p>
                      <p className="text-cyan-400 font-bold">{ticket.price} DH</p>
                    </div>

                    <div>
                      <Label htmlFor={assignmentKey} className="text-zinc-400 text-sm mb-2 block">
                        Assigner à:
                      </Label>
                      <Select
                        value={teenAssignments[assignmentKey] || ""}
                        onValueChange={(value) => setTeenAssignments((prev) => ({ ...prev, [assignmentKey]: value }))}
                        disabled={teens.length === 0}
                      >
                        <SelectTrigger id={assignmentKey} className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectValue placeholder="Sélectionner un ado" />
                        </SelectTrigger>
                        <SelectContent>
                          {teens.map((teen) => (
                            <SelectItem key={teen.id} value={teen.id}>
                              {teen.first_name} {teen.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })
            })}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-32 lg:self-start">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-75" />
          <div className="relative bg-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <h2 className="text-2xl font-bold text-white mb-6">Récapitulatif</h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-zinc-800">
              {Object.entries(selectedTickets).map(([ticketTypeId, quantity]) => {
                const ticket = ticketTypes.find((t) => t.id === ticketTypeId)
                if (!ticket) return null

                return (
                  <div key={ticketTypeId} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{ticket.name}</p>
                      <p className="text-sm text-zinc-400">x{quantity}</p>
                    </div>
                    <p className="text-white font-bold">{(ticket.price * quantity).toFixed(2)} DH</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between mb-8">
              <p className="text-xl font-bold text-white">Total</p>
              <p className="text-3xl font-black text-cyan-400">{totalPrice.toFixed(2)} DH</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
              disabled={isProcessing || needsMoreTeens || totalTickets === 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isProcessing ? "Traitement..." : "Confirmer le paiement"}
            </Button>

            <p className="text-center text-xs text-zinc-500 mt-4">
              Paiement sécurisé • Vos billets seront envoyés par email
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}

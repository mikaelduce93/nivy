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

      router.push(`/agenda?success=true`)
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
        <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
          <h2 className="text-2xl font-bold text-ink mb-6">Détails de l'événement</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-ink mb-2">{event.title}</h3>
              <div className="flex items-center gap-2 text-mute text-sm">
                <Calendar className="w-4 h-4 text-teal" />
                <span>
                  {new Date(event.event_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-mute text-sm mt-2">
                <MapPin className="w-4 h-4 text-teal" />
                <span>
                  {event.venues?.name}, {event.cities?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
          <h2 className="text-2xl font-bold text-ink mb-6">Attribution des billets</h2>

          {needsMoreTeens && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6">
              <p className="text-gold text-sm">
                Vous devez ajouter {totalTickets - teens.length} adolescent(s) supplémentaire(s) dans votre profil pour
                compléter cette réservation.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 bg-gold hover:bg-gold text-ink border-0"
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
                  <div key={assignmentKey} className="border border-ink rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-ink font-semibold">
                        {ticket.name} #{index + 1}
                      </p>
                      <p className="text-teal font-bold">{ticket.price} DH</p>
                    </div>

                    <div>
                      <Label htmlFor={assignmentKey} className="text-mute text-sm mb-2 block">
                        Assigner à:
                      </Label>
                      <Select
                        value={teenAssignments[assignmentKey] || ""}
                        onValueChange={(value) => setTeenAssignments((prev) => ({ ...prev, [assignmentKey]: value }))}
                        disabled={teens.length === 0}
                      >
                        <SelectTrigger id={assignmentKey} className="bg-card border-ink text-ink">
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
          <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-75" />
          <div className="relative bg-background rounded-2xl p-8 border border-ink">
            <h2 className="text-2xl font-bold text-ink mb-6">Récapitulatif</h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-ink">
              {Object.entries(selectedTickets).map(([ticketTypeId, quantity]) => {
                const ticket = ticketTypes.find((t) => t.id === ticketTypeId)
                if (!ticket) return null

                return (
                  <div key={ticketTypeId} className="flex items-center justify-between">
                    <div>
                      <p className="text-ink font-semibold">{ticket.name}</p>
                      <p className="text-sm text-mute">x{quantity}</p>
                    </div>
                    <p className="text-ink font-bold">{(ticket.price * quantity).toFixed(2)} DH</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between mb-8">
              <p className="text-xl font-bold text-ink">Total</p>
              <p className="text-3xl font-black text-teal">{totalPrice.toFixed(2)} DH</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0 text-lg py-6"
              disabled={isProcessing || needsMoreTeens || totalTickets === 0}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isProcessing ? "Traitement..." : "Confirmer le paiement"}
            </Button>

            <p className="text-center text-xs text-mute mt-4">
              Paiement sécurisé • Vos billets seront envoyés par email
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}

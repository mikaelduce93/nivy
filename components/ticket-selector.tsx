"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface TicketType {
  id: string
  name: string
  description: string
  price: number
  quantity_available: number
  quantity_sold: number
  includes: Record<string, boolean> | null
  is_active: boolean
}

interface TicketSelectorProps {
  eventId: string
  ticketTypes: TicketType[]
  isLoggedIn: boolean
}

export default function TicketSelector({ eventId, ticketTypes, isLoggedIn }: TicketSelectorProps) {
  const router = useRouter()
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})

  const activeTickets = ticketTypes.filter((t) => t.is_active)

  const updateQuantity = (ticketId: string, change: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0
      const ticket = activeTickets.find((t) => t.id === ticketId)
      if (!ticket) return prev

      const remaining = ticket.quantity_available - ticket.quantity_sold
      const newValue = Math.max(0, Math.min(remaining, current + change))

      if (newValue === 0) {
        const { [ticketId]: _, ...rest } = prev
        return rest
      }

      return { ...prev, [ticketId]: newValue }
    })
  }

  const totalPrice = Object.entries(selectedTickets).reduce((sum, [ticketId, qty]) => {
    const ticket = activeTickets.find((t) => t.id === ticketId)
    return sum + (ticket ? ticket.price * qty : 0)
  }, 0)

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)

  const handleCheckout = () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/agenda/${eventId}`)
      return
    }

    const ticketsParam = encodeURIComponent(JSON.stringify(selectedTickets))
    router.push(`/reservation?event=${eventId}&tickets=${ticketsParam}`)
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-6">Sélectionne tes billets</h3>

      <div className="space-y-4 mb-8">
        {activeTickets.map((ticket) => {
          const remaining = ticket.quantity_available - ticket.quantity_sold
          const selected = selectedTickets[ticket.id] || 0

          return (
            <div key={ticket.id} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{ticket.name}</h4>
                  <p className="text-sm text-zinc-400 mb-2">{ticket.description}</p>
                  {ticket.includes && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ticket.includes).map(([key, value]) =>
                        value ? (
                          <div key={key} className="flex items-center gap-1 text-xs text-cyan-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{key}</span>
                          </div>
                        ) : null,
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-cyan-400">{ticket.price} DH</p>
                  <p className="text-xs text-zinc-500">{remaining} restants</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                {remaining > 0 ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-zinc-700 bg-transparent"
                        onClick={() => updateQuantity(ticket.id, -1)}
                        disabled={selected === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-white font-bold w-8 text-center">{selected}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-zinc-700 bg-transparent"
                        onClick={() => updateQuantity(ticket.id, 1)}
                        disabled={selected >= remaining}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {selected > 0 && (
                      <p className="text-sm text-zinc-400">Sous-total: {(ticket.price * selected).toFixed(2)} DH</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-red-500 font-semibold">Épuisé</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalTickets > 0 && (
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl p-6 border border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-zinc-400">Total</p>
              <p className="text-3xl font-black text-white">{totalPrice.toFixed(2)} DH</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Billets</p>
              <p className="text-2xl font-bold text-cyan-400">{totalTickets}</p>
            </div>
          </div>
        </div>
      )}

      <Button
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
        disabled={totalTickets === 0}
        onClick={handleCheckout}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        {isLoggedIn ? "Procéder au paiement" : "Connexion requise"}
      </Button>

      {!isLoggedIn && <p className="text-center text-sm text-zinc-500 mt-4">Vous devez être connecté pour réserver</p>}
    </div>
  )
}

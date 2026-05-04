'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, Calendar, Navigation, Download, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TicketActionsProps {
  booking: {
    id: string
    booking_reference: string
    events: {
      title: string
      event_date: string
      event_time: string
      venue_name: string
      city: string
      venue_address?: string
    }
  }
}

export function TicketActions({ booking }: TicketActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const addToWallet = async () => {
    setLoading('wallet')
    try {
      // Generate Apple Wallet / Google Wallet pass
      const response = await fetch('/api/tickets/generate-wallet-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })

      if (!response.ok) throw new Error('Failed to generate wallet pass')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-${booking.booking_reference}.pkpass`
      a.click()

      toast({
        title: 'Ajouté au Wallet',
        description: 'Votre billet a été téléchargé',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter au Wallet',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const addToCalendar = () => {
    const event = booking.events
    const startDate = new Date(`${event.event_date}T${event.event_time || '20:00'}`)
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000) // +4 hours

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.venue_name}, ${event.city}`,
      `DESCRIPTION:Référence: ${booking.booking_reference}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n')

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-${booking.booking_reference}.ics`
    a.click()

    toast({
      title: 'Ajouté au calendrier',
      description: 'L\'événement a été téléchargé',
    })
  }

  const getDirections = () => {
    const address = booking.events.venue_address || `${booking.events.venue_name}, ${booking.events.city}, Maroc`
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const downloadPDF = async () => {
    setLoading('pdf')
    try {
      const response = await fetch(`/api/tickets/generate-pdf?bookingId=${booking.id}`)
      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-${booking.booking_reference}.pdf`
      a.click()

      toast({
        title: 'PDF téléchargé',
        description: 'Votre billet a été téléchargé',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le PDF',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const shareTicket = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: booking.events.title,
          text: `Je vais à ${booking.events.title} !`,
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled share
      }
    } else {
      toast({
        title: 'Lien copié',
        description: 'Le lien a été copié dans le presse-papier',
      })
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="flex flex-col h-auto py-4 gap-2"
          onClick={addToWallet}
          disabled={loading === 'wallet'}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">Wallet</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col h-auto py-4 gap-2"
          onClick={addToCalendar}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Calendrier</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col h-auto py-4 gap-2"
          onClick={getDirections}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-xs">Itinéraire</span>
        </Button>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={downloadPDF}
          disabled={loading === 'pdf'}
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger PDF
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={shareTicket}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </Button>
      </div>
    </div>
  )
}

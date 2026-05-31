"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExportRow {
  booking_reference?: string | null
  total_amount?: number | null
  payment_status?: string | null
  payment_method?: string | null
  created_at: string
  profiles?: { prenom?: string | null; nom?: string | null; email?: string | null; telephone?: string | null } | null
  events?: { title?: string | null; event_date?: string | null; city?: string | null } | null
}

/**
 * Bouton d'export CSV des réservations — extrait en composant client car le
 * `onClick` + `window`/`document` ne peut pas vivre dans un Server Component
 * (la page liste reste async/serveur). Logique d'export inchangée (#177).
 */
export function ReservationsExportButton({ rows }: { rows: ExportRow[] }) {
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      return
    }
    const csv = [
      ['Référence', 'Parent', 'Email', 'Téléphone', 'Événement', 'Date événement', 'Ville', 'Montant', 'Statut paiement', 'Méthode', 'Date réservation'].join(','),
      ...rows.map((b) =>
        [
          b.booking_reference || '',
          `${b.profiles?.prenom || ''} ${b.profiles?.nom || ''}`,
          b.profiles?.email || '',
          b.profiles?.telephone || '',
          b.events?.title || '',
          b.events?.event_date ? new Date(b.events.event_date).toLocaleDateString('fr-FR') : '',
          b.events?.city || '',
          b.total_amount || 0,
          b.payment_status || '',
          b.payment_method || '',
          new Date(b.created_at).toLocaleDateString('fr-FR'),
        ].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Button variant="pink" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Exporter CSV
    </Button>
  )
}

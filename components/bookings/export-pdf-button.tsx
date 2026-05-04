"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportPDFButtonProps {
  bookingId: string
  bookingDetails: {
    id: string
    eventTitle: string
    eventDate: string
    eventVenue: string
    eventCity: string
    childName: string
    totalPrice: number
    status: string
    ticketCode: string
  }
}

export function ExportPDFButton({ bookingId, bookingDetails }: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const generatePDF = async () => {
    setLoading(true)
    try {
      // Create a simple HTML-based PDF using print functionality
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error("Veuillez autoriser les popups pour télécharger le PDF")
        return
      }

      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Réservation ${bookingDetails.ticketCode} - Teen Club</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f8f8f8;
              padding: 40px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981, #14b8a6);
              padding: 40px;
              text-align: center;
              color: white;
            }
            .logo {
              font-size: 32px;
              font-weight: 900;
              margin-bottom: 10px;
            }
            .logo span {
              color: #fef3c7;
            }
            .ticket-code {
              background: rgba(255,255,255,0.2);
              padding: 15px 30px;
              border-radius: 10px;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 4px;
              display: inline-block;
              margin-top: 20px;
            }
            .content {
              padding: 40px;
            }
            .event-title {
              font-size: 24px;
              font-weight: 700;
              color: #18181b;
              margin-bottom: 20px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              background: #f4f4f5;
              padding: 15px;
              border-radius: 10px;
            }
            .info-label {
              font-size: 12px;
              color: #71717a;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 600;
              color: #18181b;
            }
            .status {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            }
            .status-confirmed {
              background: #d1fae5;
              color: #059669;
            }
            .status-pending {
              background: #fef3c7;
              color: #d97706;
            }
            .total {
              background: linear-gradient(135deg, #10b981, #14b8a6);
              color: white;
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              margin-top: 20px;
            }
            .total-label {
              font-size: 14px;
              opacity: 0.9;
            }
            .total-value {
              font-size: 32px;
              font-weight: 900;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f4f4f5;
              color: #71717a;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Teen<span>Club</span></div>
              <p>Confirmation de réservation</p>
              <div class="ticket-code">${bookingDetails.ticketCode}</div>
            </div>

            <div class="content">
              <h1 class="event-title">${bookingDetails.eventTitle}</h1>

              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Date</div>
                  <div class="info-value">${formatDate(bookingDetails.eventDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Lieu</div>
                  <div class="info-value">${bookingDetails.eventVenue}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Ville</div>
                  <div class="info-value">${bookingDetails.eventCity}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Participant</div>
                  <div class="info-value">${bookingDetails.childName}</div>
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 20px;">
                <span class="status status-${bookingDetails.status === 'confirmed' ? 'confirmed' : 'pending'}">
                  ${bookingDetails.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                </span>
              </div>

              <div class="total">
                <div class="total-label">Total payé</div>
                <div class="total-value">${bookingDetails.totalPrice} DH</div>
              </div>
            </div>

            <div class="footer">
              <p>Teen Club Morocco - Réservation #${bookingDetails.id.slice(0, 8)}</p>
              <p>Ce document fait office de confirmation. Présentez-le à l'entrée.</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
      toast.success("PDF généré avec succès")
    } catch (error) {
      console.error("PDF generation error:", error)
      toast.error("Erreur lors de la génération du PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={generatePDF}
      disabled={loading}
      variant="outline"
      className="border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Télécharger PDF
    </Button>
  )
}

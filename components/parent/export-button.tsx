"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet, Loader2, FileIcon } from "lucide-react"
import { toast } from "sonner"
import { getPublicAppConfig } from "@/lib/config/app-config"

const { contactEmail: CONTACT_EMAIL, appUrl: APP_URL, brandName: BRAND_NAME } = getPublicAppConfig()
const WEBSITE_DISPLAY = APP_URL.replace(/^https?:\/\//, "")

interface Transaction {
  id: string
  type: string
  teenName: string
  amount: number
  status: string
  date: string
  description: string
  discount?: number
  coinsUsed?: number
  coinType?: string
}

interface ExportButtonProps {
  transactions: Transaction[]
}

export function ExportButton({ transactions }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "booking": return "Réservation"
      case "coins": return "Coins"
      case "shop": return "Boutique"
      case "discount": return "Réduction"
      default: return type
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmé"
      case "completed": return "Terminé"
      case "pending": return "En attente"
      case "cancelled": return "Annulé"
      default: return status
    }
  }

  const exportToCSV = () => {
    setLoading(true)
    try {
      // CSV headers
      const headers = ["Date", "Teen", "Type", "Description", "Montant (DH)", "Statut"]

      // CSV rows
      const rows = transactions.map(tx => [
        formatDate(tx.date),
        tx.teenName,
        getTypeLabel(tx.type),
        tx.description,
        tx.type === "coins"
          ? `${tx.coinType === "topup" ? "+" : "-"}${tx.amount} coins`
          : `${tx.amount} DH`,
        getStatusLabel(tx.status)
      ])

      // Combine headers and rows
      const csvContent = [
        headers.join(";"),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
      ].join("\n")

      // Add BOM for Excel to recognize UTF-8
      const BOM = "\uFEFF"
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `transactions_teenclub_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Export CSV téléchargé")
    } catch (error) {
      toast.error("Erreur lors de l'export")
    } finally {
      setLoading(false)
    }
  }

  const exportToJSON = () => {
    setLoading(true)
    try {
      const exportData = transactions.map(tx => ({
        date: tx.date,
        teen: tx.teenName,
        type: getTypeLabel(tx.type),
        description: tx.description,
        amount: tx.amount,
        unit: tx.type === "coins" ? "coins" : "DH",
        status: getStatusLabel(tx.status)
      }))

      const jsonContent = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonContent], { type: "application/json" })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `transactions_teenclub_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Export JSON téléchargé")
    } catch (error) {
      toast.error("Erreur lors de l'export")
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    setLoading(true)
    try {
      // Calculate totals
      const totalBookings = transactions
        .filter(tx => tx.type === "booking" && tx.status !== "cancelled")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)

      const totalCoinsTopup = transactions
        .filter(tx => tx.type === "coins" && tx.coinType === "topup")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)

      const totalCoinsSpent = transactions
        .filter(tx => tx.type === "coins" && tx.coinType !== "topup")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)

      // Group transactions by teen
      const teenStats = transactions.reduce((acc, tx) => {
        if (!acc[tx.teenName]) {
          acc[tx.teenName] = { bookings: 0, spent: 0 }
        }
        if (tx.type === "booking" && tx.status !== "cancelled") {
          acc[tx.teenName].bookings++
          acc[tx.teenName].spent += tx.amount || 0
        }
        return acc
      }, {} as Record<string, { bookings: number; spent: number }>)

      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Historique des Transactions - TeensParty</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1e293b;
      background: white;
    }
    .report {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #14b8a6;
    }
    .logo span { color: #f59e0b; }
    .report-title {
      text-align: right;
    }
    .report-title h1 {
      font-size: 24px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .report-date {
      font-size: 12px;
      color: #64748b;
    }
    .summary-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-card h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #1e293b;
    }
    .summary-card .value.green { color: #10b981; }
    .summary-card .value.blue { color: #3b82f6; }
    .summary-card .value.amber { color: #f59e0b; }
    .teen-section {
      margin-bottom: 24px;
    }
    .teen-section h3 {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .teen-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .teen-stat {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
    }
    .teen-stat .name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .teen-stat .detail {
      font-size: 10px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f8fafc;
      padding: 10px 8px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
    }
    .type-booking { background: #ddd6fe; color: #7c3aed; }
    .type-coins { background: #fef3c7; color: #d97706; }
    .type-shop { background: #dbeafe; color: #2563eb; }
    .type-discount { background: #d1fae5; color: #059669; }
    .status-confirmed { color: #10b981; }
    .status-pending { color: #f59e0b; }
    .status-cancelled { color: #ef4444; }
    .amount { text-align: right; font-weight: 600; }
    .amount.positive { color: #10b981; }
    .amount.negative { color: #f97316; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <div class="logo">Teens<span>Party</span> Morocco</div>
      <div class="report-title">
        <h1>Historique des Transactions</h1>
        <p class="report-date">Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Réservations</h3>
        <div class="value green">${totalBookings.toLocaleString()} DH</div>
      </div>
      <div class="summary-card">
        <h3>Coins Rechargés</h3>
        <div class="value amber">${totalCoinsTopup.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Coins Dépensés</h3>
        <div class="value blue">${totalCoinsSpent.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Transactions</h3>
        <div class="value">${transactions.length}</div>
      </div>
    </div>

    <div class="teen-section">
      <h3>Résumé par Teen</h3>
      <div class="teen-stats">
        ${Object.entries(teenStats).map(([name, stats]) => `
          <div class="teen-stat">
            <div class="name">${name}</div>
            <div class="detail">${stats.bookings} réservations • ${stats.spent.toLocaleString()} DH</div>
          </div>
        `).join('')}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Teen</th>
          <th>Type</th>
          <th>Description</th>
          <th>Statut</th>
          <th style="text-align: right;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.slice(0, 50).map(tx => `
          <tr>
            <td>${formatDate(tx.date)}</td>
            <td>${tx.teenName}</td>
            <td><span class="type-badge type-${tx.type}">${getTypeLabel(tx.type)}</span></td>
            <td>${tx.description}</td>
            <td class="status-${tx.status}">${getStatusLabel(tx.status)}</td>
            <td class="amount ${tx.type === 'coins' && tx.coinType === 'topup' ? 'positive' : tx.type === 'coins' ? 'negative' : ''}">
              ${tx.type === 'coins'
                ? `${tx.coinType === 'topup' ? '+' : '-'}${tx.amount?.toLocaleString()} coins`
                : `${tx.amount?.toLocaleString()} DH`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${transactions.length > 50 ? `
      <p style="text-align: center; color: #64748b; font-size: 10px;">
        Affichage des 50 premières transactions sur ${transactions.length} au total
      </p>
    ` : ''}

    <div class="footer">
      <p><strong>${BRAND_NAME}</strong></p>
      <p>Email: ${CONTACT_EMAIL} | ${WEBSITE_DISPLAY}</p>
      <p style="margin-top: 8px;">Ce rapport a été généré automatiquement depuis votre espace parent.</p>
    </div>
  </div>
</body>
</html>
      `

      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.focus()

        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }

      toast.success("PDF prêt à imprimer")
    } catch (error) {
      toast.error("Erreur lors de l'export PDF")
    } finally {
      setLoading(false)
    }
  }

  if (transactions.length === 0) {
    return (
      <Button variant="outline" disabled className="border-zinc-700 text-zinc-500">
        <Download className="h-4 w-4 mr-2" />
        Exporter
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-zinc-700 text-zinc-300" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
        <DropdownMenuItem
          onClick={exportToCSV}
          className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-400" />
          Exporter en CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToJSON}
          className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2 text-blue-400" />
          Exporter en JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToPDF}
          className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
        >
          <FileIcon className="h-4 w-4 mr-2 text-red-400" />
          Exporter en PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

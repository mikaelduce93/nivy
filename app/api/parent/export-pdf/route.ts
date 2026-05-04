/**
 * Parent History Export PDF API
 * ==============================
 * Generate PDF reports for parent's transaction and booking history
 *
 * POST /api/parent/export-pdf - Generate PDF with parameters
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity, errorResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

// Validation schema for export request
const exportRequestSchema = z.object({
  type: z.enum(["transactions", "bookings", "full"], {
    errorMap: () => ({ message: "Type doit être 'transactions', 'bookings' ou 'full'" }),
  }),
  teenId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["pdf", "html"]).optional().default("pdf"),
})

/**
 * POST /api/parent/export-pdf
 * Generate PDF report
 */
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()

      // Verify authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return errorResponse("Non authentifié", 401)
      }

      // Verify user is a parent
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email, phone")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "parent") {
        return errorResponse("Accès réservé aux parents", 403)
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = exportRequestSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400
        )
      }

      const { type, teenId, startDate, endDate, format } = validation.data

      // Default date range: last 12 months
      const defaultEndDate = new Date()
      const defaultStartDate = new Date()
      defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1)

      const effectiveStartDate = startDate || defaultStartDate.toISOString()
      const effectiveEndDate = endDate || defaultEndDate.toISOString()

      // Get parent's teens
      let teensQuery = supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url")
        .eq("parent_id", user.id)
        .eq("role", "teen")

      if (teenId) {
        teensQuery = teensQuery.eq("id", teenId)
      }

      const { data: teens } = await teensQuery

      // Get bookings
      let bookingsData: any[] = []
      if (type === "bookings" || type === "full") {
        const { data: bookings } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_reference,
            status,
            payment_status,
            payment_method,
            total_amount,
            xp_used,
            xp_value,
            amount_after_xp,
            created_at,
            paid_at,
            events (
              title,
              date,
              location
            ),
            booking_tickets (
              profiles:child_id (
                pseudo,
                full_name
              )
            )
          `)
          .eq("parent_id", user.id)
          .gte("created_at", effectiveStartDate)
          .lte("created_at", effectiveEndDate)
          .order("created_at", { ascending: false })

        bookingsData = bookings || []
      }

      // Get transactions
      let transactionsData: any[] = []
      if (type === "transactions" || type === "full") {
        const teenIds = teens?.map((t) => t.id) || []

        if (teenIds.length > 0) {
          const { data: transactions } = await supabase
            .from("xp_transactions")
            .select(`
              id,
              amount,
              type,
              description,
              reference_type,
              created_at,
              profiles:teen_id (
                pseudo,
                full_name
              )
            `)
            .in("teen_id", teenIds)
            .gte("created_at", effectiveStartDate)
            .lte("created_at", effectiveEndDate)
            .order("created_at", { ascending: false })

          transactionsData = transactions || []
        }

        // Also get coin transactions
        const { data: coinTransactions } = await supabase
          .from("coin_transactions")
          .select(`
            id,
            amount,
            type,
            description,
            created_at,
            profiles:teen_id (
              pseudo,
              full_name
            )
          `)
          .eq("parent_id", user.id)
          .gte("created_at", effectiveStartDate)
          .lte("created_at", effectiveEndDate)
          .order("created_at", { ascending: false })

        if (coinTransactions) {
          transactionsData = [
            ...transactionsData,
            ...coinTransactions.map((t) => ({
              ...t,
              type: `coin_${t.type}`,
            })),
          ].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        }
      }

      // Generate report HTML
      const html = generateReportHTML({
        parentName: profile?.full_name || "Parent",
        parentEmail: profile?.email || "",
        teens: teens || [],
        bookings: bookingsData,
        transactions: transactionsData,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        reportType: type,
        generatedAt: new Date().toISOString(),
      })

      // Return HTML for now (PDF generation would require a headless browser or PDF library)
      if (format === "html") {
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="rapport-${type}-${new Date().toISOString().split("T")[0]}.html"`,
          },
        })
      }

      // For PDF, return HTML with print-ready styles
      // In production, you would use a service like Puppeteer, wkhtmltopdf, or a SaaS like DocRaptor
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="rapport-${type}-${new Date().toISOString().split("T")[0]}.pdf"`,
        },
      })
    } catch (error) {
      console.error("[Export PDF] Error:", error)
      return errorResponse("Erreur lors de la génération du rapport", 500)
    }
  },
  { rateLimit: "api" }
)

interface ReportData {
  parentName: string
  parentEmail: string
  teens: any[]
  bookings: any[]
  transactions: any[]
  startDate: string
  endDate: string
  reportType: string
  generatedAt: string
}

function generateReportHTML(data: ReportData): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} DH`
  const formatXP = (amount: number) => `${amount >= 0 ? "+" : ""}${amount} XP`

  // Calculate totals
  const totalBookings = data.bookings.length
  const totalPaid = data.bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const totalXPUsed = data.bookings.reduce((sum, b) => sum + (b.xp_used || 0), 0)
  const totalXPEarned = data.transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalXPSpent = Math.abs(
    data.transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  )

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport - TeensParty Morocco</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
      background: white;
    }
    .report { max-width: 900px; margin: 0 auto; padding: 40px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #14b8a6;
    }
    .logo { font-size: 24px; font-weight: bold; color: #14b8a6; }
    .logo span { color: #f59e0b; }
    .report-title { text-align: right; }
    .report-title h1 { font-size: 20px; color: #1e293b; margin-bottom: 8px; }
    .report-meta { font-size: 11px; color: #64748b; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 40px;
    }
    .summary-card {
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
    .summary-card .value.positive { color: #10b981; }
    .summary-card .value.negative { color: #ef4444; }

    .section { margin-bottom: 40px; }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    th {
      background: #f8fafc;
      padding: 10px 8px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr:hover td { background: #fafafa; }

    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
    }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .status-confirmed { background: #dbeafe; color: #1e40af; }

    .amount-positive { color: #10b981; font-weight: 600; }
    .amount-negative { color: #ef4444; font-weight: 600; }

    .teens-list {
      display: flex;
      gap: 16px;
      margin-bottom: 30px;
    }
    .teen-chip {
      background: #f0fdfa;
      border: 1px solid #14b8a6;
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 11px;
      color: #0d9488;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report { padding: 20px; }
      .summary-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <div class="logo">Teens<span>Party</span> Morocco</div>
      <div class="report-title">
        <h1>Rapport d'Activité</h1>
        <p class="report-meta">
          ${formatDate(data.startDate)} - ${formatDate(data.endDate)}<br>
          Généré le ${formatDate(data.generatedAt)}
        </p>
      </div>
    </div>

    <div class="teens-list">
      <strong>Enfants:</strong>
      ${data.teens.map((t) => `<span class="teen-chip">${t.pseudo || t.full_name}</span>`).join("")}
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Réservations</h3>
        <div class="value">${totalBookings}</div>
      </div>
      <div class="summary-card">
        <h3>Total Payé</h3>
        <div class="value">${formatCurrency(totalPaid)}</div>
      </div>
      <div class="summary-card">
        <h3>XP Gagnés</h3>
        <div class="value positive">+${totalXPEarned}</div>
      </div>
      <div class="summary-card">
        <h3>XP Utilisés</h3>
        <div class="value negative">-${totalXPUsed + totalXPSpent}</div>
      </div>
    </div>

    ${
      data.bookings.length > 0
        ? `
    <div class="section">
      <h2 class="section-title">Historique des Réservations</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Référence</th>
            <th>Événement</th>
            <th>Enfant(s)</th>
            <th>Montant</th>
            <th>XP</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${data.bookings
            .map(
              (b) => `
          <tr>
            <td>${formatDate(b.created_at)}</td>
            <td>${b.booking_reference}</td>
            <td>${b.events?.title || "-"}</td>
            <td>${b.booking_tickets?.map((t: any) => t.profiles?.pseudo || t.profiles?.full_name).join(", ") || "-"}</td>
            <td>${formatCurrency(b.total_amount)}</td>
            <td>${b.xp_used ? `${b.xp_used} XP` : "-"}</td>
            <td><span class="status status-${b.payment_status}">${b.payment_status}</span></td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    ${
      data.transactions.length > 0
        ? `
    <div class="section">
      <h2 class="section-title">Historique des Transactions XP</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Enfant</th>
            <th>Type</th>
            <th>Description</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.transactions
            .map(
              (t) => `
          <tr>
            <td>${formatDate(t.created_at)}</td>
            <td>${t.profiles?.pseudo || t.profiles?.full_name || "-"}</td>
            <td>${t.type}</td>
            <td>${t.description || "-"}</td>
            <td class="${t.amount >= 0 ? "amount-positive" : "amount-negative"}">${formatXP(t.amount)}</td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    <div class="footer">
      <p><strong>TeensParty Morocco</strong></p>
      <p>Ce rapport a été généré automatiquement à partir de votre compte parent.</p>
      <p>Pour toute question: contact@teensparty.ma</p>
    </div>
  </div>
</body>
</html>
`
}

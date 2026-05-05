/**
 * PDF Invoice Generation
 * Generates professional invoice PDFs for bookings and payments
 */

import { getPublicAppConfig } from "@/lib/config/app-config"

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string

  // Customer info
  customerName: string
  customerEmail: string
  customerPhone?: string

  // Items
  items: {
    description: string
    quantity: number
    unitPrice: number
    total: number
  }[]

  // Totals
  subtotal: number
  discount?: number
  discountLabel?: string
  total: number

  // Payment info
  paymentMethod: string
  paymentStatus: "paid" | "pending" | "failed"
  paidAt?: string
  transactionId?: string

  // Event info (optional)
  eventTitle?: string
  eventDate?: string
  eventLocation?: string

  // Booking reference
  bookingReference?: string
}

/**
 * Generate invoice PDF as base64 data URL
 * Uses HTML/CSS approach for consistent rendering
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const { contactEmail, supportPhone, appUrl, brandName } = getPublicAppConfig()
  const websiteDisplay = appUrl.replace(/^https?:\/\//, "")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} DH`
  }

  const statusColor = data.paymentStatus === "paid"
    ? "#10b981"
    : data.paymentStatus === "pending"
      ? "#f59e0b"
      : "#ef4444"

  const statusText = data.paymentStatus === "paid"
    ? "PAYEE"
    : data.paymentStatus === "pending"
      ? "EN ATTENTE"
      : "ECHOUEE"

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
      background: white;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #14b8a6;
    }
    .logo span {
      color: #f59e0b;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 28px;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-size: 14px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      color: white;
      margin-top: 8px;
      background-color: ${statusColor};
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .info-block {
      flex: 1;
    }
    .info-block h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .info-block p {
      margin-bottom: 4px;
    }
    .event-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .event-card h3 {
      color: #14b8a6;
      margin-bottom: 8px;
    }
    .event-details {
      display: flex;
      gap: 24px;
      font-size: 11px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    th:last-child {
      text-align: right;
    }
    td {
      padding: 16px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .totals {
      width: 300px;
      margin-left: auto;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-row.discount {
      color: #10b981;
    }
    .totals-row.total {
      border-bottom: none;
      border-top: 2px solid #1e293b;
      font-size: 16px;
      font-weight: bold;
      padding-top: 12px;
    }
    .payment-info {
      background: #ecfdf5;
      border: 1px solid #10b981;
      border-radius: 8px;
      padding: 16px;
      margin-top: 30px;
    }
    .payment-info h4 {
      color: #059669;
      margin-bottom: 8px;
    }
    .payment-info p {
      font-size: 11px;
      color: #064e3b;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }
    .footer p {
      margin-bottom: 4px;
    }
    .qr-section {
      text-align: center;
      margin-top: 30px;
    }
    .qr-placeholder {
      width: 80px;
      height: 80px;
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">
        Teens<span>Party</span> Morocco
      </div>
      <div class="invoice-title">
        <h1>FACTURE</h1>
        <p class="invoice-number">${data.invoiceNumber}</p>
        <span class="status-badge">${statusText}</span>
      </div>
    </div>

    <div class="info-section">
      <div class="info-block">
        <h3>Facture de</h3>
        <p><strong>TeensParty Morocco SARL</strong></p>
        <p>123 Boulevard Mohammed V</p>
        <p>Casablanca, 20000</p>
        <p>Maroc</p>
        <p>ICE: 003456789000012</p>
      </div>
      <div class="info-block">
        <h3>Facturer a</h3>
        <p><strong>${data.customerName}</strong></p>
        <p>${data.customerEmail}</p>
        ${data.customerPhone ? `<p>${data.customerPhone}</p>` : ""}
      </div>
      <div class="info-block">
        <h3>Details</h3>
        <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
        ${data.bookingReference ? `<p><strong>Ref:</strong> ${data.bookingReference}</p>` : ""}
        ${data.transactionId ? `<p><strong>Trans.:</strong> ${data.transactionId}</p>` : ""}
      </div>
    </div>

    ${data.eventTitle ? `
    <div class="event-card">
      <h3>${data.eventTitle}</h3>
      <div class="event-details">
        ${data.eventDate ? `<span>Date: ${formatDate(data.eventDate)}</span>` : ""}
        ${data.eventLocation ? `<span>Lieu: ${data.eventLocation}</span>` : ""}
      </div>
    </div>
    ` : ""}

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qte</th>
          <th>Prix unitaire</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Sous-total</span>
        <span>${formatCurrency(data.subtotal)}</span>
      </div>
      ${data.discount ? `
      <div class="totals-row discount">
        <span>${data.discountLabel || "Reduction"}</span>
        <span>-${formatCurrency(data.discount)}</span>
      </div>
      ` : ""}
      <div class="totals-row total">
        <span>Total TTC</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>

    ${data.paymentStatus === "paid" ? `
    <div class="payment-info">
      <h4>Paiement recu</h4>
      <p><strong>Methode:</strong> ${data.paymentMethod}</p>
      ${data.paidAt ? `<p><strong>Date:</strong> ${formatDate(data.paidAt)}</p>` : ""}
      <p>Merci pour votre confiance!</p>
    </div>
    ` : ""}

    <div class="footer">
      <p><strong>${brandName}</strong></p>
      <p>Email: ${contactEmail} | Tel: ${supportPhone}</p>
      <p>${websiteDisplay}</p>
      <p style="margin-top: 12px;">Cette facture a ete generee electroniquement et est valide sans signature.</p>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Generate invoice number from booking/transaction data
 */
export function generateInvoiceNumber(prefix: string, id: string, date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const shortId = id.slice(0, 8).toUpperCase()
  return `${prefix}-${year}${month}-${shortId}`
}

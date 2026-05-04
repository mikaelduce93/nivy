import { resend, EMAIL_FROM, isResendConfigured } from "./resend"
import BookingConfirmationEmail from "@/emails/booking-confirmation"
import EventReminderEmail from "@/emails/event-reminder"
import WelcomeEmail from "@/emails/welcome-email"
import PaymentConfirmationEmail from "@/emails/payment-confirmation"
import ApprovalRequestEmail from "@/emails/approval-request"

/**
 * Helper function to check if Resend is configured before sending emails
 */
function checkResendConfig() {
  if (!resend || !isResendConfigured()) {
    console.warn("[Resend] Not configured - email not sent. Set RESEND_API_KEY to enable emails.")
    return false
  }
  return true
}

/* ==========================================================================
   BOOKING EMAILS
   ========================================================================== */

export async function sendBookingConfirmation(data: {
  to: string
  parentName: string
  childName: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  bookingReference: string
  totalAmount: number
  qrCodeUrl?: string
}) {
  try {
    if (!resend) {
      console.warn("[Resend] Not configured - email not sent. Set RESEND_API_KEY to enable emails.")
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `✅ Réservation confirmée - ${data.eventTitle}`,
      react: BookingConfirmationEmail(data),
    })

    if (error) {
      console.error("Error sending booking confirmation:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send booking confirmation:", error)
    return { success: false, error }
  }
}

export async function sendEventReminder(data: {
  to: string
  parentName: string
  childName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string
  bookingReference: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `⏰ Rappel: ${data.eventTitle} - ${data.eventDate}`,
      react: EventReminderEmail(data),
    })

    if (error) {
      console.error("Error sending event reminder:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send event reminder:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   WELCOME & ONBOARDING
   ========================================================================== */

export async function sendWelcomeEmail(data: { to: string; name: string }) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: "🎉 Bienvenue sur Teens Party Morocco!",
      react: WelcomeEmail(data),
    })

    if (error) {
      console.error("Error sending welcome email:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   PAYMENT EMAILS
   ========================================================================== */

export async function sendPaymentConfirmation(data: {
  to: string
  parentName: string
  paymentType: "booking" | "topup"
  amount: number
  description: string
  transactionId: string
  paymentMethod: string
  paidAt: string
}) {
  try {
    const subject = data.paymentType === "topup"
      ? `💳 Recharge confirmée - ${data.amount} DH`
      : `✅ Paiement confirmé - ${data.amount} DH`

    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject,
      react: PaymentConfirmationEmail(data),
    })

    if (error) {
      console.error("Error sending payment confirmation:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send payment confirmation:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   APPROVAL EMAILS
   ========================================================================== */

export async function sendApprovalRequest(data: {
  to: string
  parentName: string
  teenName: string
  requestType: "booking" | "purchase" | "topup"
  title: string
  description?: string
  amount?: number
  eventDate?: string
  eventLocation?: string
  expiresAt?: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `🔔 ${data.teenName} a besoin de votre approbation`,
      react: ApprovalRequestEmail(data),
    })

    if (error) {
      console.error("Error sending approval request:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send approval request:", error)
    return { success: false, error }
  }
}

export async function sendApprovalNotification(data: {
  to: string
  teenName: string
  requestTitle: string
  status: "approved" | "rejected"
  reason?: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const emoji = data.status === "approved" ? "✅" : "❌"
    const statusText = data.status === "approved" ? "approuvée" : "refusée"

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `${emoji} Demande ${statusText}: ${data.requestTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${data.status === "approved" ? "#10b981" : "#ef4444"}">
            ${emoji} Demande ${statusText}
          </h1>
          <p>Bonjour ${data.teenName},</p>
          <p>Votre demande <strong>"${data.requestTitle}"</strong> a été ${statusText} par votre parent.</p>
          ${data.reason ? `<p><strong>Raison:</strong> ${data.reason}</p>` : ""}
          <p><a href="https://teensparty.ma/teen" style="color: #0891b2;">Accéder à ton espace</a></p>
          <hr style="border: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #8898aa; font-size: 12px;">Teens Party Morocco</p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending approval notification:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send approval notification:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   COIN TOPUP EMAILS
   ========================================================================== */

export async function sendCoinTopupNotification(data: {
  to: string
  teenName: string
  coinsAmount: number
  bonusAmount?: number
  fromParent: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const totalCoins = data.coinsAmount + (data.bonusAmount || 0)

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `🎉 Tu as reçu ${totalCoins} coins!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 32px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🪙 Coins reçus!</h1>
          </div>
          <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151;">Salut ${data.teenName}!</p>
            <p style="color: #374151;">${data.fromParent} t'a envoyé des coins:</p>
            <div style="text-align: center; padding: 24px; background: #fffbeb; border-radius: 8px; margin: 16px 0;">
              <p style="font-size: 48px; margin: 0; color: #f59e0b; font-weight: bold;">${data.coinsAmount}</p>
              <p style="color: #92400e; margin: 4px 0;">coins</p>
              ${data.bonusAmount ? `<p style="color: #059669; font-weight: bold;">+ ${data.bonusAmount} bonus!</p>` : ""}
            </div>
            <p style="color: #6b7280; text-align: center;">
              Utilise tes coins dans la <a href="https://teensparty.ma/teen/shop" style="color: #f59e0b;">boutique</a>
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            Teens Party Morocco
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending coin topup notification:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send coin topup notification:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   VIP PASS EMAILS
   ========================================================================== */

export async function sendPassActivationEmail(data: {
  to: string
  parentName: string
  tierName: string
  cardNumber: string
  expiryDate: string
  discountPercentage: number
  monthlyEventsIncluded: number
  priorityBookingHours: number
}) {
  try {
    const tierColor = data.tierName.toLowerCase() === 'platinum' ? '#a855f7' : '#f59e0b'
    const tierGradient = data.tierName.toLowerCase() === 'platinum'
      ? 'linear-gradient(135deg, #a855f7, #ec4899)'
      : 'linear-gradient(135deg, #f59e0b, #f97316)'

    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `👑 Bienvenue au Club VIP ${data.tierName}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
          <div style="background: ${tierGradient}; padding: 40px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">👑</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenue au Club VIP!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Pass ${data.tierName} activé</p>
          </div>

          <div style="background: white; padding: 32px;">
            <p style="color: #374151; font-size: 16px;">Bonjour ${data.parentName},</p>
            <p style="color: #374151;">Félicitations! Ton Pass VIP ${data.tierName} est maintenant actif. Tu fais désormais partie du club exclusif TEEN PARTY MOROCCO!</p>

            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid ${tierColor};">
              <h3 style="margin: 0 0 16px 0; color: #1f2937;">📋 Détails de ta carte</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Numéro de carte</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937; text-align: right;">${data.cardNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Type</td>
                  <td style="padding: 8px 0; font-weight: bold; color: ${tierColor}; text-align: right;">${data.tierName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Valide jusqu'au</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #1f2937; text-align: right;">${data.expiryDate}</td>
                </tr>
              </table>
            </div>

            <h3 style="color: #1f2937; margin: 24px 0 16px 0;">✨ Tes avantages</h3>
            <div style="display: grid; gap: 12px;">
              <div style="background: #ecfdf5; padding: 16px; border-radius: 8px;">
                <strong style="color: #059669;">${data.discountPercentage}% de réduction</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Sur tous les événements</p>
              </div>
              <div style="background: #eff6ff; padding: 16px; border-radius: 8px;">
                <strong style="color: #2563eb;">${data.monthlyEventsIncluded} events inclus/mois</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Sans frais supplémentaires</p>
              </div>
              <div style="background: #fef3c7; padding: 16px; border-radius: 8px;">
                <strong style="color: #d97706;">${data.priorityBookingHours}h d'avance</strong>
                <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Réservation prioritaire</p>
              </div>
            </div>

            <p style="text-align: center; margin: 32px 0 0 0;">
              <a href="https://teensparty.ma/evenements" style="display: inline-block; background: ${tierGradient}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Découvrir les événements
              </a>
            </p>
          </div>

          <div style="padding: 24px; text-align: center; background: #f8fafc;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Teens Party Morocco - Club VIP 👑</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending pass activation email:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send pass activation email:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   BIRTHDAY/ANNIVERSAIRE EMAILS
   ========================================================================== */

export async function sendBirthdayConfirmation(data: {
  to: string
  parentName: string
  childName: string
  childAge?: string
  celebrationDate: string
  packageName: string
  guestCount: number
  totalPrice: number
  bookingReference: string
  qrCodeUrl?: string
  extras?: string[]
}) {
  try {
    const extrasHtml = data.extras && data.extras.length > 0
      ? `<p style="margin: 4px 0;"><strong>Options:</strong> ${data.extras.join(", ")}</p>`
      : ""

    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `🎂 Réservation anniversaire confirmée - ${data.childName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
          <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎂 Anniversaire Réservé!</h1>
          </div>
          <div style="background: white; padding: 24px;">
            <p style="color: #374151;">Bonjour ${data.parentName},</p>
            <p style="color: #374151;">La réservation d'anniversaire pour <strong>${data.childName}</strong>${data.childAge ? ` (${data.childAge} ans)` : ""} est confirmée!</p>

            <div style="background: #fdf4ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ec4899;">
              <p style="margin: 4px 0; color: #374151;"><strong>Référence:</strong> ${data.bookingReference}</p>
              <p style="margin: 4px 0; color: #374151;"><strong>Date:</strong> ${data.celebrationDate}</p>
              <p style="margin: 4px 0; color: #374151;"><strong>Formule:</strong> ${data.packageName}</p>
              <p style="margin: 4px 0; color: #374151;"><strong>Invités:</strong> ${data.guestCount} personnes</p>
              ${extrasHtml}
              <p style="margin: 12px 0 4px 0; font-size: 24px; font-weight: bold; color: #ec4899;">${data.totalPrice} DH</p>
            </div>

            ${data.qrCodeUrl ? `
            <div style="text-align: center; padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; margin: 20px 0;">
              <p style="color: #6b7280; margin-bottom: 12px;">Présente ce QR code le jour J:</p>
              <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;">
            </div>
            ` : ""}

            <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #059669; margin: 0; font-size: 14px;">
                💡 Conseil: Enregistre ce mail et le QR code. Tu peux aussi retrouver ta réservation dans ton espace "Mes Réservations".
              </p>
            </div>

            <p style="text-align: center;">
              <a href="https://teensparty.ma/mes-reservations" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Voir ma réservation
              </a>
            </p>
          </div>
          <div style="padding: 16px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Teens Party Morocco - Anniversaires Inoubliables 🎉</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending birthday confirmation:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send birthday confirmation:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   AMBASSADOR EMAILS
   ========================================================================== */

export async function sendCommissionEarned(data: {
  to: string
  ambassadorName: string
  referralName: string
  commissionAmount: number
  eventTitle: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `💰 Commission gagnée: ${data.commissionAmount} DH`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0;">💰 Commission gagnée!</h1>
          </div>
          <div style="padding: 24px;">
            <p>Bonjour ${data.ambassadorName},</p>
            <p>Bonne nouvelle! Vous avez gagné une commission:</p>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 16px 0; text-align: center;">
              <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 0;">${data.commissionAmount} DH</p>
            </div>
            <p><strong>Filleul:</strong> ${data.referralName}</p>
            <p><strong>Événement:</strong> ${data.eventTitle}</p>
            <p>
              <a href="https://teensparty.ma/ambassador" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Voir mes commissions
              </a>
            </p>
          </div>
          <p style="color: #8898aa; font-size: 12px; text-align: center;">Teens Party Morocco - Programme Ambassadeur</p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending commission earned:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send commission earned:", error)
    return { success: false, error }
  }
}

/* ==========================================================================
   PARTNER EMAILS
   ========================================================================== */

export async function sendOfferRedeemed(data: {
  to: string
  partnerName: string
  customerName: string
  offerTitle: string
  discountValue: string
  redeemedAt: string
}) {
  try {
    if (!checkResendConfig()) {
      return { success: false, error: "Email service not configured" }
    }

    const { error } = await resend!.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `🎟️ Offre utilisée: ${data.offerTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6366f1; padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎟️ Offre utilisée</h1>
          </div>
          <div style="padding: 24px;">
            <p>Bonjour ${data.partnerName},</p>
            <p>Un client vient d'utiliser l'une de vos offres:</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Offre:</strong> ${data.offerTitle}</p>
              <p style="margin: 4px 0;"><strong>Réduction:</strong> ${data.discountValue}</p>
              <p style="margin: 4px 0;"><strong>Client:</strong> ${data.customerName}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${data.redeemedAt}</p>
            </div>
            <p>
              <a href="https://teensparty.ma/partner" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Voir le dashboard
              </a>
            </p>
          </div>
          <p style="color: #8898aa; font-size: 12px; text-align: center;">Teens Party Morocco - Partenaires</p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending offer redeemed:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send offer redeemed:", error)
    return { success: false, error }
  }
}

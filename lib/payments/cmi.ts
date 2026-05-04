/**
 * CMI (Centre Monétique Interbancaire) Payment Gateway for Morocco
 * ================================================================
 * Official integration with Morocco's interbank payment gateway
 *
 * Required environment variables:
 * - CMI_MERCHANT_ID: Your CMI merchant ID
 * - CMI_STORE_KEY: Your CMI store secret key (for hash generation)
 * - CMI_CLIENT_ID: Your CMI client ID
 * - CMI_API_ENDPOINT: CMI gateway URL (test/production)
 */

import crypto from 'crypto'

interface CMIPaymentRequest {
  amount: number // In DH
  orderId: string
  customerEmail: string
  customerPhone?: string
  description: string
  callbackUrl: string
  bookingId?: string
  xpUsed?: number
}

interface CMIPaymentResponse {
  success: boolean
  paymentUrl?: string
  formHtml?: string
  orderId?: string
  error?: string
}

interface CMICallbackResult {
  success: boolean
  orderId: string
  transactionId?: string
  authCode?: string
  responseCode: string
  message: string
  amount?: number
}

export class CMIPaymentGateway {
  private merchantId: string
  private storeKey: string
  private clientId: string
  private apiEndpoint: string
  private testMode: boolean
  private appUrl: string

  constructor() {
    this.merchantId = process.env.CMI_MERCHANT_ID || ''
    this.storeKey = process.env.CMI_STORE_KEY || ''
    this.clientId = process.env.CMI_CLIENT_ID || ''
    this.apiEndpoint = process.env.CMI_API_ENDPOINT || 'https://testpayment.cmi.co.ma/fim/est3Dgate'
    this.testMode = process.env.NODE_ENV !== 'production'
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Create CMI payment and generate form HTML
   */
  async createPayment(request: CMIPaymentRequest): Promise<CMIPaymentResponse> {
    try {
      if (!this.merchantId || !this.storeKey) {
        // In dev mode without CMI config, return mock response
        if (this.testMode) {
          return this.createMockPayment(request)
        }
        throw new Error('CMI credentials not configured')
      }

      // Generate unique transaction reference
      const rnd = this.generateTransactionRef()

      // Amount in centimes (CMI requires amount * 100)
      const amountCentimes = Math.round(request.amount * 100).toString()

      // Build callback URLs
      const okUrl = `${this.appUrl}/api/payments/cmi/callback`
      const failUrl = `${this.appUrl}/api/payments/cmi/callback`
      const callbackUrl = `${this.appUrl}/api/payments/cmi/webhook`

      // Prepare form data
      const formData: Record<string, string> = {
        clientid: this.clientId,
        storetype: '3D_PAY_HOSTING',
        trantype: 'PreAuth',
        amount: amountCentimes,
        currency: '504', // MAD currency code
        oid: request.orderId,
        okUrl,
        failUrl,
        callbackUrl,
        lang: 'fr',
        email: request.customerEmail,
        BillToName: request.customerEmail.split('@')[0],
        encoding: 'UTF-8',
        hashAlgorithm: 'ver3',
        rnd,
        // Custom data for our use
        ...(request.bookingId && { bookingId: request.bookingId }),
        ...(request.xpUsed && { xpUsed: request.xpUsed.toString() }),
      }

      // Calculate hash (CMI specific format)
      const hashData = [
        formData.clientid,
        formData.oid,
        formData.amount,
        okUrl,
        failUrl,
        formData.storetype,
        formData.trantype,
        formData.rnd,
      ].join('|')

      formData.HASH = this.generateHash(hashData)

      // Generate auto-submit form HTML
      const formHtml = this.generateFormHtml(formData)

      return {
        success: true,
        formHtml,
        orderId: request.orderId,
        paymentUrl: this.apiEndpoint,
      }
    } catch (error) {
      console.error('[CMI] Payment creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Parse and verify CMI callback
   */
  parseCallback(params: Record<string, string>): CMICallbackResult {
    const responseCode = params.ProcReturnCode || params.Response || ''
    const isSuccess = responseCode === '00' || params.Response === 'Approved'

    // Verify hash if present
    if (params.HASH && !this.verifyCallbackHash(params)) {
      return {
        success: false,
        orderId: params.oid || '',
        responseCode: 'HASH_INVALID',
        message: 'Signature de réponse invalide',
      }
    }

    return {
      success: isSuccess,
      orderId: params.oid || '',
      transactionId: params.TransId,
      authCode: params.AuthCode,
      responseCode,
      message: this.getResponseMessage(responseCode),
      amount: params.amount ? parseFloat(params.amount) / 100 : undefined,
    }
  }

  /**
   * Verify callback hash from CMI
   */
  verifyCallbackHash(params: Record<string, string>): boolean {
    try {
      const receivedHash = params.HASH

      // Build verification hash
      const hashFields = [
        params.clientid,
        params.oid,
        params.AuthCode,
        params.ProcReturnCode,
        params.Response,
        params.mdStatus,
        params.rnd,
      ]
        .filter(Boolean)
        .join('|')

      const calculatedHash = this.generateHash(hashFields)

      return receivedHash?.toUpperCase() === calculatedHash
    } catch {
      return false
    }
  }

  /**
   * Generate hash using CMI's algorithm
   */
  private generateHash(data: string): string {
    const hashInput = data + '|' + this.storeKey
    return crypto
      .createHash('sha512')
      .update(hashInput, 'utf8')
      .digest('hex')
      .toUpperCase()
  }

  /**
   * Generate unique transaction reference
   */
  private generateTransactionRef(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `TP${timestamp}${random}`.toUpperCase()
  }

  /**
   * Generate auto-submit form HTML
   */
  private generateFormHtml(formData: Record<string, string>): string {
    const formFields = Object.entries(formData)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`)
      .join('\n')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirection vers CMI...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .loader {
            text-align: center;
            max-width: 400px;
          }
          .logo { font-size: 32px; margin-bottom: 20px; }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #27272a;
            border-top-color: #22c55e;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0 0 12px; font-size: 20px; }
          p { color: #a1a1aa; font-size: 14px; margin: 0; }
          .secure { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; font-size: 12px; color: #22c55e; }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="logo">🔐</div>
          <div class="spinner"></div>
          <h2>Redirection vers le portail CMI</h2>
          <p>Vous allez être redirigé vers le portail de paiement sécurisé CMI...</p>
          <div class="secure">
            <span>🔒</span>
            <span>Connexion sécurisée SSL</span>
          </div>
        </div>
        <form id="cmiForm" method="POST" action="${this.apiEndpoint}">
          ${formFields}
        </form>
        <script>
          setTimeout(function() {
            document.getElementById('cmiForm').submit();
          }, 1500);
        </script>
      </body>
      </html>
    `
  }

  /**
   * Create mock payment for development
   */
  private createMockPayment(request: CMIPaymentRequest): CMIPaymentResponse {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>CMI Test Mode</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 40px; max-width: 400px; text-align: center; }
          h2 { color: #22c55e; margin: 0 0 20px; }
          p { color: #a1a1aa; margin: 0 0 24px; }
          .amount { font-size: 32px; font-weight: bold; margin: 20px 0; }
          .buttons { display: flex; gap: 12px; }
          button { flex: 1; padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          .success { background: #22c55e; color: #000; }
          .fail { background: #ef4444; color: #fff; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🧪 CMI Test Mode</h2>
          <p>Simulation de paiement CMI</p>
          <div class="amount">${request.amount} DH</div>
          <p>Order ID: ${request.orderId}</p>
          <div class="buttons">
            <button class="success" onclick="window.location.href='/api/payments/cmi/callback?oid=${request.orderId}&ProcReturnCode=00&Response=Approved&TransId=TEST123'">Succès</button>
            <button class="fail" onclick="window.location.href='/api/payments/cmi/callback?oid=${request.orderId}&ProcReturnCode=05&Response=Declined'">Échec</button>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      success: true,
      formHtml: mockHtml,
      orderId: request.orderId,
    }
  }

  /**
   * Get human-readable message for CMI response code
   */
  private getResponseMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'Transaction approuvée',
      '01': 'Référez-vous à l\'émetteur de la carte',
      '03': 'Commerçant invalide',
      '04': 'Carte à retirer',
      '05': 'Transaction refusée',
      '12': 'Transaction invalide',
      '13': 'Montant invalide',
      '14': 'Numéro de carte invalide',
      '30': 'Erreur de format',
      '41': 'Carte perdue',
      '43': 'Carte volée',
      '51': 'Fonds insuffisants',
      '54': 'Carte expirée',
      '55': 'PIN incorrect',
      '57': 'Transaction non autorisée',
      '61': 'Dépassement de plafond',
      '91': 'Émetteur non disponible',
      '96': 'Erreur système',
      '99': 'Abandon utilisateur',
    }
    return messages[code] || 'Erreur de transaction'
  }
}

/**
 * Helper to escape HTML
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

export const cmiGateway = new CMIPaymentGateway()

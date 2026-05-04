/**
 * Mobile Money Payment Processing for Morocco
 * ==========================================
 * Supports: Orange Money, inwi Money, Maroc Telecom Cash
 *
 * Environment variables:
 * - ORANGE_MONEY_API_KEY
 * - ORANGE_MONEY_MERCHANT_CODE
 * - INWI_MONEY_API_KEY
 * - INWI_MONEY_MERCHANT_ID
 * - MT_CASH_API_KEY
 * - MT_CASH_MERCHANT_ID
 */

export type MobileMoneyOperator = 'orange_money' | 'inwi_money' | 'maroc_telecom_cash'

export interface MobileMoneyPaymentRequest {
  operator: MobileMoneyOperator
  phone: string
  amount: number
  reference: string
  description: string
  bookingId?: string
  xpUsed?: number
}

export interface MobileMoneyPaymentResponse {
  success: boolean
  paymentId?: string
  code?: string
  instructions?: string
  expiresAt?: Date
  error?: string
}

export interface MobileMoneyPaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'expired'
  paymentId: string
  transactionId?: string
  paidAt?: Date
  error?: string
}

// Operator configurations
const OPERATOR_CONFIG = {
  orange_money: {
    name: 'Orange Money',
    color: '#FF6600',
    ussdCode: '#150#',
    merchantCode: process.env.ORANGE_MONEY_MERCHANT_CODE || 'TEENSPARTY',
    apiKey: process.env.ORANGE_MONEY_API_KEY,
    apiEndpoint: process.env.ORANGE_MONEY_API_ENDPOINT || 'https://api.orange.ma/payment',
  },
  inwi_money: {
    name: 'inwi Money',
    color: '#E30613',
    ussdCode: '*120#',
    merchantId: process.env.INWI_MONEY_MERCHANT_ID || 'TEENSPARTY',
    apiKey: process.env.INWI_MONEY_API_KEY,
    apiEndpoint: process.env.INWI_MONEY_API_ENDPOINT || 'https://api.inwi.ma/money',
  },
  maroc_telecom_cash: {
    name: 'MT Cash',
    color: '#0064B5',
    ussdCode: '#111#',
    merchantId: process.env.MT_CASH_MERCHANT_ID || 'TEENSPARTY',
    apiKey: process.env.MT_CASH_API_KEY,
    apiEndpoint: process.env.MT_CASH_API_ENDPOINT || 'https://api.iam.ma/mtcash',
  },
}

// Payment code expiry in minutes
const PAYMENT_CODE_EXPIRY_MINUTES = 30

export class MobileMoneyService {
  private testMode: boolean

  constructor() {
    this.testMode = process.env.NODE_ENV !== 'production'
  }

  /**
   * Initiate a mobile money payment
   */
  async initiatePayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      // Validate phone number format (Moroccan numbers)
      if (!this.validatePhone(request.phone)) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide. Format: 06XXXXXXXX ou 07XXXXXXXX',
        }
      }

      // Validate amount
      if (request.amount < 1) {
        return {
          success: false,
          error: 'Le montant minimum est de 1 DH',
        }
      }

      // Generate payment code
      const code = this.generatePaymentCode(request.reference)
      const paymentId = this.generatePaymentId()
      const expiresAt = new Date(Date.now() + PAYMENT_CODE_EXPIRY_MINUTES * 60 * 1000)

      // In production, call the actual operator API
      if (!this.testMode && OPERATOR_CONFIG[request.operator].apiKey) {
        const apiResult = await this.callOperatorAPI(request, code, paymentId)
        if (!apiResult.success) {
          return apiResult
        }
      }

      // Get operator-specific instructions
      const instructions = this.getOperatorInstructions(
        request.operator,
        code,
        request.amount
      )

      return {
        success: true,
        paymentId,
        code,
        instructions,
        expiresAt,
      }
    } catch (error) {
      console.error('[MobileMoney] Payment initiation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'initiation du paiement',
      }
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(
    operator: MobileMoneyOperator,
    paymentId: string
  ): Promise<MobileMoneyPaymentStatus> {
    try {
      // In test mode, simulate random status
      if (this.testMode) {
        return {
          status: 'pending',
          paymentId,
        }
      }

      // Call operator API to check status
      const config = OPERATOR_CONFIG[operator]
      if (!config.apiKey) {
        return { status: 'pending', paymentId }
      }

      // Implementation would call actual operator API here
      // For now, return pending
      return {
        status: 'pending',
        paymentId,
      }
    } catch (error) {
      console.error('[MobileMoney] Status check error:', error)
      return {
        status: 'pending',
        paymentId,
        error: 'Impossible de vérifier le statut',
      }
    }
  }

  /**
   * Verify a completed payment
   */
  async verifyPayment(
    operator: MobileMoneyOperator,
    code: string,
    phone: string,
    expectedAmount: number
  ): Promise<{ verified: boolean; transactionId?: string; error?: string }> {
    try {
      // In test mode, always verify successfully
      if (this.testMode) {
        return {
          verified: true,
          transactionId: `MM${Date.now()}`,
        }
      }

      // Call operator API to verify
      // Implementation depends on each operator's API
      return {
        verified: false,
        error: 'Vérification manuelle requise',
      }
    } catch (error) {
      console.error('[MobileMoney] Verification error:', error)
      return {
        verified: false,
        error: 'Erreur lors de la vérification',
      }
    }
  }

  /**
   * Get operator configuration
   */
  getOperatorConfig(operator: MobileMoneyOperator) {
    return OPERATOR_CONFIG[operator]
  }

  /**
   * Get all available operators
   */
  getAvailableOperators() {
    return Object.entries(OPERATOR_CONFIG).map(([id, config]) => ({
      id: id as MobileMoneyOperator,
      name: config.name,
      color: config.color,
      ussdCode: config.ussdCode,
    }))
  }

  /**
   * Validate Moroccan phone number
   */
  private validatePhone(phone: string): boolean {
    // Remove spaces and common prefixes
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+212/, '0')
    // Check format: 06XXXXXXXX or 07XXXXXXXX
    return /^0[67][0-9]{8}$/.test(cleaned)
  }

  /**
   * Format phone number to international format
   */
  formatPhoneInternational(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+212/, '0')
    if (cleaned.startsWith('0')) {
      return '+212' + cleaned.substring(1)
    }
    return phone
  }

  /**
   * Generate payment code
   */
  private generatePaymentCode(reference: string): string {
    // Generate 8-digit payment code
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0')
    return `${timestamp}${random}`
  }

  /**
   * Generate unique payment ID
   */
  private generatePaymentId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `MM${timestamp}${random}`.toUpperCase()
  }

  /**
   * Call operator API (placeholder for real integration)
   */
  private async callOperatorAPI(
    request: MobileMoneyPaymentRequest,
    code: string,
    paymentId: string
  ): Promise<MobileMoneyPaymentResponse> {
    // This would be implemented with actual operator APIs
    // Each operator has different integration requirements:
    // - Orange Money: REST API with OAuth2
    // - inwi Money: SOAP/REST hybrid
    // - MT Cash: REST API with HMAC signing

    console.log('[MobileMoney] Would call operator API:', {
      operator: request.operator,
      phone: request.phone,
      amount: request.amount,
      code,
      paymentId,
    })

    return {
      success: true,
      paymentId,
      code,
    }
  }

  /**
   * Get operator-specific instructions
   */
  private getOperatorInstructions(
    operator: MobileMoneyOperator,
    code: string,
    amount: number
  ): string {
    switch (operator) {
      case 'orange_money': {
        const orangeConfig = OPERATOR_CONFIG.orange_money
        return `
**Instructions Orange Money**

1. Composez **${orangeConfig.ussdCode}** sur votre téléphone Orange
2. Sélectionnez **"Payer un marchand"**
3. Entrez le code marchand: **${orangeConfig.merchantCode}**
4. Entrez le code paiement: **${code}**
5. Confirmez le montant: **${amount} DH**
6. Validez avec votre **code PIN**

Votre paiement sera confirmé automatiquement.
        `.trim()
      }

      case 'inwi_money': {
        const inwiConfig = OPERATOR_CONFIG.inwi_money
        return `
**Instructions inwi Money**

1. Composez **${inwiConfig.ussdCode}** sur votre téléphone inwi
2. Sélectionnez **"Paiement marchand"**
3. Entrez le code: **${code}**
4. Confirmez le montant: **${amount} DH**
5. Validez avec votre **code PIN**

Vous recevrez un SMS de confirmation.
        `.trim()
      }

      case 'maroc_telecom_cash': {
        const mtConfig = OPERATOR_CONFIG.maroc_telecom_cash
        return `
**Instructions MT Cash**

1. Composez **${mtConfig.ussdCode}** sur votre téléphone Maroc Telecom
2. Sélectionnez **"Payer un service"**
3. Entrez le code: **${code}**
4. Confirmez le montant: **${amount} DH**
5. Validez avec votre **code secret**

La confirmation sera envoyée par SMS.
        `.trim()
      }

      default:
        return 'Instructions non disponibles pour cet opérateur'
    }
  }
}

export const mobileMoneyService = new MobileMoneyService()

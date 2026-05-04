// Security utilities for input validation and sanitization

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .trim()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (Moroccan format)
 */
export function isValidMoroccanPhone(phone: string): boolean {
  // Moroccan phone numbers: +212 followed by 9 digits
  const phoneRegex = /^(\+212|0)[5-7]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

/**
 * Validate age (for children profiles)
 */
export function isValidAge(birthDate: string): { valid: boolean; age: number } {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return {
    valid: age >= 13 && age <= 17,
    age,
  }
}

/**
 * Rate limiting check (to be used with a cache like Redis)
 */
export interface RateLimitConfig {
  identifier: string // IP address or user ID
  limit: number // Maximum requests
  window: number // Time window in seconds
}

export function getRateLimitKey(config: RateLimitConfig): string {
  return `ratelimit:${config.identifier}:${Math.floor(Date.now() / (config.window * 1000))}`
}

/**
 * Validate booking reference format
 */
export function isValidBookingReference(ref: string): boolean {
  // Format: TP-YYYYMMDD-XXXX
  const refRegex = /^TP-\d{8}-[A-Z0-9]{4}$/
  return refRegex.test(ref)
}

/**
 * Check if user is authorized to access resource
 */
export function checkResourceOwnership(resourceOwnerId: string, currentUserId: string): boolean {
  return resourceOwnerId === currentUserId
}

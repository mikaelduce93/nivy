/**
 * TEENS PARTY MOROCCO - Sanitization Utilities
 * ============================================
 *
 * Utilitaires de sanitisation frontend pour prévenir
 * les attaques XSS et injection.
 */

/* ==========================================================================
   STRING SANITIZERS
   ========================================================================== */

/**
 * Supprime les balises HTML
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Échappe les caractères HTML dangereux
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }
  return input.replace(/[&<>"'`=/]/g, (char) => map[char] || char)
}

/**
 * Déséchappe les caractères HTML
 */
export function unescapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&#039;': "'",
  }
  return input.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#039);/g, (entity) => map[entity] || entity)
}

/**
 * Supprime les scripts et event handlers
 */
export function stripScripts(input: string): string {
  return input
    // Supprime les balises script
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Supprime les event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Supprime javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Supprime data: protocol (peut contenir du JS)
    .replace(/data\s*:/gi, '')
    // Supprime vbscript: protocol
    .replace(/vbscript\s*:/gi, '')
}

/**
 * Sanitise une chaîne pour affichage sûr
 * - Supprime scripts et event handlers
 * - Échappe les caractères dangereux
 */
export function sanitizeForDisplay(input: string): string {
  return escapeHtml(stripScripts(input))
}

/**
 * Sanitise pour insertion dans le DOM
 * - Supprime toutes les balises HTML
 * - Normalise les espaces
 */
export function sanitizeForDom(input: string): string {
  return stripHtml(input)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sanitise un input de formulaire
 * - Supprime scripts
 * - Trim et normalise
 */
export function sanitizeInput(input: string): string {
  return stripScripts(input)
    .replace(/\s+/g, ' ')
    .trim()
}

/* ==========================================================================
   URL SANITIZERS
   ========================================================================== */

/**
 * Vérifie si une URL est sûre
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    return !dangerousProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Sanitise une URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  // Supprime espaces et caractères de contrôle
  // eslint-disable-next-line no-control-regex
  const cleaned = url.replace(/[\x00-\x1f\x7f]/g, '').trim()

  // Vérifie le protocole
  if (!isSafeUrl(cleaned)) {
    return ''
  }

  return cleaned
}

/**
 * Encode les paramètres URL
 */
export function encodeUrlParams(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
}

/* ==========================================================================
   OBJECT SANITIZERS
   ========================================================================== */

/**
 * Sanitise récursivement un objet
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    stripHtml?: boolean
    maxStringLength?: number
    maxDepth?: number
  } = {}
): T {
  const { stripHtml: shouldStripHtml = true, maxStringLength = 10000, maxDepth = 10 } = options

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return undefined

    if (typeof value === 'string') {
      let sanitized = shouldStripHtml ? stripScripts(value) : value
      if (sanitized.length > maxStringLength) {
        sanitized = sanitized.slice(0, maxStringLength)
      }
      return sanitized.trim()
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1))
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        // Skip prototype pollution keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue
        }
        result[key] = sanitizeValue(val, depth + 1)
      }
      return result
    }

    return value
  }

  return sanitizeValue(obj, 0) as T
}

/**
 * Sanitise les données de formulaire
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeObject(data, {
    stripHtml: true,
    maxStringLength: 50000,
    maxDepth: 5,
  })
}

/* ==========================================================================
   SPECIALIZED SANITIZERS
   ========================================================================== */

/**
 * Sanitise un nom (prénom, nom de famille)
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

/**
 * Sanitise un email
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '')
    .trim()
    .slice(0, 255)
}

/**
 * Sanitise un numéro de téléphone
 */
export function sanitizePhone(phone: string): string {
  return phone
    .replace(/[^0-9+]/g, '')
    .slice(0, 20)
}

/**
 * Sanitise un pseudo
 */
export function sanitizePseudo(pseudo: string): string {
  return pseudo
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 20)
}

/**
 * Sanitise un montant
 */
export function sanitizeAmount(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value
  return isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100)
}

/**
 * Sanitise une date (YYYY-MM-DD)
 */
export function sanitizeDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''

  const [, year, month, day] = match
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)

  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return ''
  }

  return `${year}-${month}-${day}`
}

/* ==========================================================================
   VALIDATION HELPERS
   ========================================================================== */

/**
 * Vérifie si une chaîne contient du contenu potentiellement dangereux
 */
export function containsUnsafeContent(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
  ]

  return patterns.some((pattern) => pattern.test(input))
}

/**
 * Vérifie si un fichier uploadé est sûr (par extension)
 */
export function isSafeFileExtension(filename: string): boolean {
  const safeExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.txt', '.csv', '.json',
  ]

  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]
  return ext ? safeExtensions.includes(ext) : false
}

/**
 * Vérifie et limite la taille d'un fichier
 */
export function isFileSizeValid(size: number, maxMB: number = 10): boolean {
  return size <= maxMB * 1024 * 1024
}

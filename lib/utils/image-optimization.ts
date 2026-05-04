/**
 * TEENS PARTY MOROCCO - Image Optimization Utilities
 * ===================================================
 *
 * Utilities for image optimization:
 * - Blur placeholder generation
 * - Responsive sizes calculation
 * - Image loading strategies
 */

/* ==========================================================================
   BLUR PLACEHOLDER
   ========================================================================== */

/**
 * Base64 encoded blur placeholder for images
 * This is a small gray placeholder image
 */
export const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIRAAAgIBBAMBAAAAAAAAAAAAAQIDBAAFERIhBhMxQf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwCvqXlFzUpJZ5LJjkcyOzkKvZ7JHX85MbVLR/Y0Y/mMYxmoz/9k='

/**
 * Shimmer effect as blur placeholder (darker version for dark mode)
 */
export const SHIMMER_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjcyNzJhIi8+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSI+PGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iZmlsbCIgdmFsdWVzPSIjMjcyNzJhOyMzZjNmNDY7IzI3MjcyYSIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz48L3JlY3Q+PC9zdmc+'

/* ==========================================================================
   RESPONSIVE SIZES
   ========================================================================== */

/**
 * Common responsive sizes configurations
 */
export const SIZES = {
  /** Full width hero images */
  hero: '100vw',
  /** Card images in a grid */
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  /** Thumbnail images */
  thumbnail: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  /** Avatar images */
  avatar: {
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
  },
  /** Gallery images */
  gallery: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
} as const

/* ==========================================================================
   IMAGE QUALITY
   ========================================================================== */

/**
 * Image quality presets
 */
export const QUALITY = {
  /** High quality for hero/featured images */
  high: 90,
  /** Standard quality for most images */
  standard: 85,
  /** Lower quality for thumbnails */
  thumbnail: 75,
  /** Lowest quality for background images */
  background: 60,
} as const

/* ==========================================================================
   LOADING PRIORITIES
   ========================================================================== */

/**
 * Determine if an image should be loaded with priority
 * based on its position in the viewport
 */
export function shouldPrioritize(index: number, itemsPerRow: number = 3): boolean {
  // Prioritize first row of images (above the fold)
  return index < itemsPerRow
}

/* ==========================================================================
   IMAGE DIMENSIONS
   ========================================================================== */

/**
 * Calculate aspect ratio dimensions
 */
export function getAspectRatioDimensions(
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16',
  baseWidth: number = 400
): { width: number; height: number } {
  const ratios: Record<string, number> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
    '3:4': 3 / 4,
    '9:16': 9 / 16,
  }

  const ratio = ratios[aspectRatio] || 1
  return {
    width: baseWidth,
    height: Math.round(baseWidth / ratio),
  }
}

/* ==========================================================================
   PLACEHOLDER COLORS
   ========================================================================== */

/**
 * Generate a solid color placeholder data URL
 */
export function generateColorPlaceholder(color: string = '#27272a'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${color}"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/* ==========================================================================
   SRCSET HELPER
   ========================================================================== */

/**
 * Common image breakpoints for srcSet
 */
export const IMAGE_BREAKPOINTS = [320, 480, 640, 750, 828, 1080, 1200, 1920] as const

/**
 * Generate srcSet string for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: readonly number[] = IMAGE_BREAKPOINTS
): string {
  // For Next.js Image, srcSet is handled automatically
  // This is useful for custom implementations
  return widths.map((w) => `${baseUrl}?w=${w} ${w}w`).join(', ')
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  BLUR_DATA_URL,
  SHIMMER_DATA_URL,
  SIZES,
  QUALITY,
  shouldPrioritize,
  getAspectRatioDimensions,
  generateColorPlaceholder,
  IMAGE_BREAKPOINTS,
  generateSrcSet,
}

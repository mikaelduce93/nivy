/**
 * TEENS PARTY MOROCCO - Optimized Event Image (Server Component)
 * ==============================================================
 *
 * Composant d'image optimisé pour les événements.
 * Utilise next/image avec des paramètres optimisés.
 */

import Image from 'next/image'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface OptimizedEventImageProps {
  /** Image source URL */
  src?: string | null
  /** Alt text for accessibility */
  alt: string
  /** Fixed width (for non-fill mode) */
  width?: number
  /** Fixed height (for non-fill mode) */
  height?: number
  /** Fill mode (responsive) */
  fill?: boolean
  /** Priority loading (for LCP images) */
  priority?: boolean
  /** Additional className */
  className?: string
  /** Image sizes for responsive loading */
  sizes?: string
}

/* ==========================================================================
   DEFAULT PLACEHOLDER
   ========================================================================== */

const DEFAULT_EVENT_IMAGE = '/images/event-placeholder.jpg'

// Blur placeholder (base64 encoded tiny image)
const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIRAAAgIBBAMBAAAAAAAAAAAAAQIDBAAFERIhBhMxQf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwCvqXlFzUpJZ5LJjkcyOzkKvZ7JHX85MbVLR/Y0Y/mMYxmoz/9k='

/* ==========================================================================
   OPTIMIZED EVENT IMAGE COMPONENT
   ========================================================================== */

export function OptimizedEventImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  sizes,
}: OptimizedEventImageProps) {
  const imageSrc = src || DEFAULT_EVENT_IMAGE

  // Default sizes for responsive images
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : undefined

  // For fill mode
  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes={sizes || defaultSizes}
        className={cn('object-cover', className)}
        quality={85}
      />
    )
  }

  // For fixed dimensions
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={cn('object-cover', className)}
      quality={85}
    />
  )
}

/* ==========================================================================
   AVATAR IMAGE (for profiles)
   ========================================================================== */

interface AvatarImageProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

const DEFAULT_AVATAR = '/images/avatar-placeholder.png'

export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
}: AvatarImageProps) {
  const dimension = avatarSizes[size]

  return (
    <Image
      src={src || DEFAULT_AVATAR}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn('rounded-full object-cover', className)}
      quality={90}
    />
  )
}

/* ==========================================================================
   HERO IMAGE (for large hero sections)
   ========================================================================== */

interface HeroImageProps {
  src: string
  alt: string
  priority?: boolean
  className?: string
}

export function HeroImage({
  src,
  alt,
  priority = true,
  className,
}: HeroImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      sizes="100vw"
      className={cn('object-cover', className)}
      quality={90}
    />
  )
}

/* ==========================================================================
   THUMBNAIL IMAGE (for lists, galleries)
   ========================================================================== */

interface ThumbnailImageProps {
  src?: string | null
  alt: string
  aspectRatio?: 'square' | 'video' | 'portrait'
  className?: string
}

export function ThumbnailImage({
  src,
  alt,
  aspectRatio = 'video',
  className,
}: ThumbnailImageProps) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClasses[aspectRatio], className)}>
      <Image
        src={src || DEFAULT_EVENT_IMAGE}
        alt={alt}
        fill
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover"
        quality={75}
      />
    </div>
  )
}

import imageCompression from 'browser-image-compression'

export interface ImageCompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  preserveExif?: boolean
}

const defaultOptions: ImageCompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: false,
}

/**
 * Compresses an image file to reduce file size while maintaining quality.
 * Uses browser-image-compression library which handles EXIF orientation.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as a File object
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...defaultOptions, ...options }

  // Skip compression for small files (< 100KB) or non-image files
  if (file.size < 100 * 1024 || !file.type.startsWith('image/')) {
    return file
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: mergedOptions.maxSizeMB,
      maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
      useWebWorker: mergedOptions.useWebWorker,
      preserveExif: mergedOptions.preserveExif,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    })

    return compressedFile
  } catch (error) {
    console.error('[ImageCompression] Compression failed, returning original:', error)
    return file
  }
}

/**
 * Compresses an image and returns it as a Blob.
 * Useful for Supabase Storage uploads.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as a Blob
 */
export async function compressImageToBlob(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<Blob> {
  const compressedFile = await compressImage(file, options)
  return compressedFile
}

/**
 * Validates image file before upload.
 *
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 10)
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez JPG, PNG, GIF ou WebP.',
    }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `L'image ne doit pas dépasser ${maxSizeMB} Mo.`,
    }
  }

  return { valid: true }
}

/**
 * Gets image dimensions from a file.
 *
 * @param file - The image file
 * @returns Promise with width and height
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Creates a thumbnail preview URL for an image file.
 *
 * @param file - The image file
 * @param maxSize - Maximum width/height for thumbnail (default: 200)
 * @returns Data URL of the thumbnail
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  const compressed = await compressImage(file, {
    maxWidthOrHeight: maxSize,
    maxSizeMB: 0.1,
  })

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })
}

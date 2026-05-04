"use client"

/**
 * Image Gallery Component (Stub)
 * ===============================
 * Placeholder for lazy-loaded image gallery/lightbox.
 * Can be replaced with a real gallery implementation later.
 */

import Image from "next/image"

interface ImageGalleryProps {
  images?: string[]
  className?: string
}

export default function ImageGallery({ images = [], className }: ImageGalleryProps) {
  if (images.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((src, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
            <Image
              src={src}
              alt={`Image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

/**
 * PDF Viewer Component (Stub)
 * ===========================
 * Placeholder for lazy-loaded PDF viewer.
 * Can be replaced with a real PDF viewer implementation (e.g., react-pdf) later.
 */

interface PDFViewerProps {
  url?: string
  className?: string
}

export default function PDFViewer({ url, className }: PDFViewerProps) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center p-8 bg-card rounded-lg ${className || ""}`}>
        <p className="text-mute">Aucun document à afficher</p>
      </div>
    )
  }

  return (
    <div className={`w-full ${className || ""}`}>
      <iframe
        src={url}
        className="w-full h-[600px] rounded-lg border border-ink"
        title="PDF Viewer"
      />
    </div>
  )
}

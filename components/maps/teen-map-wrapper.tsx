"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation, Loader2 } from 'lucide-react'

// Lazy load the actual map component
export function TeenMapWrapper() {
  const [MapComponent, setMapComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only import on client-side
    import('./teen-map')
      .then((mod) => {
        setMapComponent(() => mod.default)
      })
      .catch((err) => {
        console.error('Error loading map:', err)
        setError('Impossible de charger la carte')
      })
  }, [])

  if (error) {
    return (
      <Card className="w-full h-[300px] bg-card rounded-2xl flex items-center justify-center border-ink">
        <div className="text-center text-mute">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
        </div>
      </Card>
    )
  }

  if (!MapComponent) {
    return (
      <Card className="w-full h-[300px] bg-card rounded-2xl flex items-center justify-center border-ink animate-pulse">
        <div className="text-center text-mute">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Chargement de la carte...</p>
        </div>
      </Card>
    )
  }

  return <MapComponent />
}

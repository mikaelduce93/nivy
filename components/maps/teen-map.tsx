"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation, Map as MapIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

// Mock Data
const LOCATIONS = [
  { id: 1, name: 'Soirée Neon', type: 'event', position: [33.5731, -7.5898] as [number, number], description: 'Le plus grand event de l\'année !' },
  { id: 2, name: 'Burger King', type: 'partner', position: [33.5892, -7.6184] as [number, number], description: '-20% avec tes XP' },
  { id: 3, name: 'Parc Ligue Arabe', type: 'challenge', position: [33.5855, -7.6247] as [number, number], description: 'Défi: 5km Run' },
]

// Dynamic imports for react-leaflet components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

export default function TeenMap() {
  const [selectedLocation, setSelectedLocation] = useState<typeof LOCATIONS[0] | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
    })
  }, [])

  if (!isClient || !L) {
    return (
      <div className="w-full h-full bg-[#020203] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <MapIcon className="w-12 h-12 text-zinc-800 animate-pulse" />
          <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Initializing Map Engine...</p>
        </div>
      </div>
    )
  }

  // Fix default icon issue in Leaflet
  const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <MapContainer
        center={[33.5731, -7.5898]}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#020203' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {LOCATIONS.map((loc) => (
          <Marker
            key={loc.id}
            position={loc.position}
            icon={customIcon}
            eventHandlers={{
              click: () => setSelectedLocation(loc),
            }}
          />
        ))}
      </MapContainer>

      {/* Overlay UI - Top Gradient */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#020203] to-transparent pointer-events-none z-[400]" />

      {/* Selected Location Card */}
      {selectedLocation && (
        <div className="absolute bottom-10 left-6 right-6 z-[1000]">
          <Card className="bg-black/60 backdrop-blur-2xl border-white/10 p-6 rounded-[2rem] shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex justify-between items-center">
              <div className="space-y-1">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                  selectedLocation.type === 'event' ? 'bg-purple-500/20 text-purple-400' :
                  selectedLocation.type === 'partner' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-orange-500/20 text-orange-400'
                )}>
                  {selectedLocation.type}
                </span>
                <h3 className="text-xl font-black text-white uppercase italic">{selectedLocation.name}</h3>
                <p className="text-zinc-400 text-xs font-medium">{selectedLocation.description}</p>
              </div>
              <Button size="lg" className="rounded-2xl bg-white text-black hover:bg-zinc-200 font-black shadow-xl">
                <Navigation className="w-5 h-5 mr-2" /> GO
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

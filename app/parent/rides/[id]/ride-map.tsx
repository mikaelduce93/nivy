"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
})
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false })
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false })

interface LatLng {
  lat: number
  lng: number
}

interface Track extends LatLng {
  captured_at: string
}

interface Props {
  tracks: Track[]
  pickup: LatLng | null
  dropoff: LatLng | null
}

export function RideMap({ tracks, pickup, dropoff }: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
    // Inject leaflet CSS once on the client without typing pain.
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
  }, [])

  if (!ready) return <div className="h-[360px] bg-muted rounded animate-pulse" />

  const center: [number, number] = tracks.length
    ? [Number(tracks[tracks.length - 1].lat), Number(tracks[tracks.length - 1].lng)]
    : pickup
    ? [pickup.lat, pickup.lng]
    : [33.5731, -7.5898] // Casablanca default
  const positions: [number, number][] = tracks.map((t) => [Number(t.lat), Number(t.lng)])

  // react-leaflet's prop typing is awkward with Next.js dynamic; cast through any.
  const Map = MapContainer as unknown as React.ComponentType<Record<string, unknown>>
  const Tile = TileLayer as unknown as React.ComponentType<Record<string, unknown>>
  const Mk = Marker as unknown as React.ComponentType<Record<string, unknown>>
  const Pl = Polyline as unknown as React.ComponentType<Record<string, unknown>>

  return (
    <div className="h-[360px] w-full rounded overflow-hidden">
      <Map center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <Tile
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup && <Mk position={[pickup.lat, pickup.lng]} />}
        {dropoff && <Mk position={[dropoff.lat, dropoff.lng]} />}
        {positions.length > 1 && <Pl positions={positions} />}
        {positions.length > 0 && <Mk position={positions[positions.length - 1]} />}
      </Map>
    </div>
  )
}

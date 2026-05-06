"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Navigation, MapPinOff } from "lucide-react"

interface FriendMapProps {
  friends: Array<{ id: string, name: string, lat: number, lng: number, avatar?: string }>
  venueName?: string
  /** Optional venue center; defaults to Casablanca */
  centerLng?: number
  centerLat?: number
}

/**
 * FriendMap renders a static Mapbox snapshot when NEXT_PUBLIC_MAPBOX_TOKEN is
 * configured. Otherwise it shows an honest "carte indisponible" placeholder
 * instead of a broken map. No fake/mock token is sent to Mapbox.
 */
export function FriendMap({
  friends,
  venueName,
  centerLng = -7.6,
  centerLat = 33.5,
}: FriendMapProps) {
  const rawToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  const hasValidToken =
    !!rawToken &&
    rawToken !== "mock" &&
    rawToken !== "placeholder" &&
    !rawToken.startsWith("mock") &&
    !rawToken.startsWith("placeholder")

  const mapboxUrl = hasValidToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${centerLng},${centerLat},13,0/600x400?access_token=${encodeURIComponent(rawToken!)}`
    : null

  return (
    <Card className="w-full overflow-hidden border-2 border-cyan-200">
      <div className="h-40 bg-slate-100 relative">
        {mapboxUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url('${mapboxUrl}')` }}
            role="img"
            aria-label={venueName ? `Carte de ${venueName}` : "Carte"}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-1"
            role="status"
          >
            <MapPinOff className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs font-medium">Carte indisponible</span>
          </div>
        )}

        {/* Venue Marker (only when map is available) */}
        {mapboxUrl && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <MapPin className="w-8 h-8 text-red-500 drop-shadow-md animate-bounce" />
            <Badge className="bg-white text-black shadow-sm">{venueName || "Lieu"}</Badge>
          </div>
        )}

        {/* Friends Markers (approximate positions; only when map is available) */}
        {mapboxUrl && friends.map((friend, i) => (
          <div
            key={friend.id}
            className="absolute flex flex-col items-center"
            style={{
              top: `${40 + (i % 2 === 0 ? 20 : -20)}%`,
              left: `${30 + (i * 20)}%`,
            }}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-md">
              {friend.name.charAt(0)}
            </div>
          </div>
        ))}
      </div>
      <CardContent className="p-3 bg-white">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            {friends.length} amis sur place
          </div>
          {mapboxUrl ? (
            <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-slate-100">
              <Navigation className="w-3 h-3" />
              Y aller
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 opacity-60" aria-label="Carte non configurée">
              Configurer la carte
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

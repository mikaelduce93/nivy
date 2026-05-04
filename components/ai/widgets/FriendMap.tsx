"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Navigation } from "lucide-react"

interface FriendMapProps {
  friends: Array<{ id: string, name: string, lat: number, lng: number, avatar?: string }>
  venueName?: string
}

export function FriendMap({ friends, venueName }: FriendMapProps) {
  return (
    <Card className="w-full overflow-hidden border-2 border-cyan-200">
      <div className="h-40 bg-slate-100 relative">
        {/* Mock Map Background */}
        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-7.6,33.5,13,0/600x400?access_token=mock')] bg-cover bg-center opacity-50" />
        
        {/* Venue Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <MapPin className="w-8 h-8 text-red-500 drop-shadow-md animate-bounce" />
          <Badge className="bg-white text-black shadow-sm">{venueName || "Skatepark"}</Badge>
        </div>

        {/* Friends Markers (Mock positions around center) */}
        {friends.map((friend, i) => (
          <div 
            key={friend.id}
            className="absolute flex flex-col items-center"
            style={{ 
              top: `${40 + (i % 2 === 0 ? 20 : -20)}%`, 
              left: `${30 + (i * 20)}%` 
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
          <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-slate-100">
            <Navigation className="w-3 h-3" />
            Y aller
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

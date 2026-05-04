"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrCode, Ticket, Clock } from "lucide-react"

interface OfferPreviewProps {
  title: string
  discount: number
  expiresIn: string
}

export function OfferPreview({ title, discount, expiresIn }: OfferPreviewProps) {
  return (
    <div className="relative group cursor-pointer">
      {/* Ticket Shape */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-emerald-100 flex">
        {/* Left Part (Main) */}
        <div className="flex-1 p-4 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex justify-between items-start mb-2">
            <Badge className="bg-red-500 hover:bg-red-600 text-white animate-pulse">
              FLASH -{discount}%
            </Badge>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-lg leading-tight mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground mb-3">Valable pour les 50 premiers.</p>
          <div className="text-xs font-mono text-emerald-600 bg-emerald-100 px-2 py-1 rounded inline-block">
            CODE: FLASH-{discount}
          </div>
        </div>

        {/* Dashed Line */}
        <div className="w-4 border-l-2 border-dashed border-emerald-200 relative bg-white">
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-emerald-50" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-emerald-50" />
        </div>

        {/* Right Part (QR) */}
        <div className="w-20 bg-emerald-600 flex items-center justify-center p-2">
          <QrCode className="w-10 h-10 text-white/90" />
        </div>
      </div>
      
      {/* 3D Effect Layer */}
      <div className="absolute -inset-1 bg-emerald-500/20 rounded-lg blur-sm -z-10 group-hover:blur-md transition-all" />
    </div>
  )
}

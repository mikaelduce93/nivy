"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Lock, Unlock, Settings, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ControlCenterProps {
  pendingCount: number
  activePermissionsCount: number
  teensCount: number
}

export function ControlCenter({ pendingCount, activePermissionsCount, teensCount }: ControlCenterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
        pendingCount > 0 ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-paper-2 border-ink text-mute"
      )}>
        <ShieldCheck className="h-5 w-5" />
      </div>
      {pendingCount > 0 && (
        <span className="text-xs font-black text-destructive animate-pulse">{pendingCount} ALERTS</span>
      )}
    </div>
  )
}

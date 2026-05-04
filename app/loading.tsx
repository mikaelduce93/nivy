import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.2s" }} />

          {/* Center spinner */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        </div>

        <p className="mt-6 text-muted-foreground font-medium">Chargement...</p>
      </div>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { 
  AlertCircle, 
  RefreshCw, 
  WifiOff, 
  Clock, 
  ServerOff, 
  Brain,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FallbackProps {
  className?: string
}

interface ErrorFallbackProps extends FallbackProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

interface RateLimitFallbackProps extends FallbackProps {
  retryAfter?: number
  onRetry?: () => void
}

interface AIUnavailableFallbackProps extends FallbackProps {
  alternatives?: Array<{
    label: string
    href: string
    icon?: React.ReactNode
  }>
}

/**
 * Generic error fallback
 */
export function ErrorFallback({ 
  title = "Une erreur est survenue",
  message = "Nous n'avons pas pu charger le contenu. Veuillez réessayer.",
  onRetry,
  retryLabel = "Réessayer",
  className 
}: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl",
        "bg-destructive/5 border border-destructive/20",
        className
      )}
    >
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </motion.div>
  )
}

/**
 * Offline fallback
 */
export function OfflineFallback({ className }: FallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl",
        "bg-yellow-500/5 border border-yellow-500/20",
        className
      )}
    >
      <WifiOff className="h-12 w-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-bold text-foreground mb-2">Hors ligne</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Vérifie ta connexion internet et réessaie.
      </p>
    </motion.div>
  )
}

/**
 * Rate limit fallback
 */
export function RateLimitFallback({ 
  retryAfter = 60,
  onRetry,
  className 
}: RateLimitFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl",
        "bg-orange-500/5 border border-orange-500/20",
        className
      )}
    >
      <Clock className="h-12 w-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-bold text-foreground mb-2">Trop de requêtes</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Tu vas trop vite ! Attends quelques secondes avant de réessayer.
      </p>
      {retryAfter > 0 && (
        <div className="text-xs text-orange-400 font-mono mb-4">
          Réessayer dans {retryAfter}s
        </div>
      )}
      {onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline" 
          className="gap-2"
          disabled={retryAfter > 0}
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      )}
    </motion.div>
  )
}

/**
 * Server error fallback
 */
export function ServerErrorFallback({ 
  onRetry,
  className 
}: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl",
        "bg-red-500/5 border border-red-500/20",
        className
      )}
    >
      <ServerOff className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-bold text-foreground mb-2">Serveur indisponible</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Nos serveurs sont temporairement indisponibles. Réessaie dans quelques instants.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      )}
    </motion.div>
  )
}

/**
 * AI unavailable fallback with alternatives
 */
export function AIUnavailableFallback({ 
  alternatives = [
    { label: 'Explorer les quêtes', href: '/teen/quests', icon: <Sparkles className="h-4 w-4" /> },
    { label: 'Voir la map', href: '/teen/social?tab=map', icon: <ArrowRight className="h-4 w-4" /> },
  ],
  className 
}: AIUnavailableFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl",
        "bg-brand-soft/5 border border-brand-soft/20",
        className
      )}
    >
      <div className="relative mb-4">
        <Brain className="h-12 w-12 text-brand-soft opacity-50" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-brand-soft/30 border-t-brand-soft rounded-full"
        />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">IA en maintenance</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        L'assistant IA est temporairement indisponible. En attendant, explore ces options :
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {alternatives.map((alt, idx) => (
          <Link key={idx} href={alt.href}>
            <Button variant="outline" size="sm" className="gap-2 border-brand-soft/30 hover:bg-brand-soft/10">
              {alt.icon}
              {alt.label}
            </Button>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

/**
 * Loading skeleton for content
 */
export function ContentSkeleton({ 
  lines = 3,
  className 
}: FallbackProps & { lines?: number }) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="h-4 bg-muted rounded-md"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Empty state fallback
 */
export function EmptyStateFallback({
  icon: Icon = Sparkles,
  title = "Rien à afficher",
  message = "Il n'y a pas encore de contenu ici.",
  action,
  className
}: FallbackProps & {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  message?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="default" className="gap-2">
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} variant="default" className="gap-2">
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )
      )}
    </motion.div>
  )
}

export default {
  ErrorFallback,
  OfflineFallback,
  RateLimitFallback,
  ServerErrorFallback,
  AIUnavailableFallback,
  ContentSkeleton,
  EmptyStateFallback,
}

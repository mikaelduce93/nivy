'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, WifiOff, RefreshCw, Home, ServerCrash, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/* ==========================================================================
   BASE ERROR COMPONENT
   ========================================================================== */

interface ErrorStateProps {
  title: string
  message: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
  variant?: 'default' | 'compact' | 'inline'
}

export function ErrorState({
  title,
  message,
  icon,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: ErrorStateProps) {
  const isCompact = variant === 'compact'
  const isInline = variant === 'inline'

  if (isInline) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20', className)}>
        <div className="text-red-400">
          {icon || <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">{title}</p>
          <p className="text-xs text-red-400/70 truncate">{message}</p>
        </div>
        {action && (
          action.href ? (
            <Link href={action.href}>
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={action.onClick}>
              {action.label}
            </Button>
          )
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'p-6' : 'p-8 sm:p-12',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className={cn(
          'rounded-full bg-red-500/10 flex items-center justify-center mb-4',
          isCompact ? 'w-12 h-12' : 'w-16 h-16 sm:w-20 sm:h-20'
        )}
      >
        <div className={cn('text-red-400', isCompact ? '' : 'scale-125')}>
          {icon || <AlertTriangle className={isCompact ? 'w-6 h-6' : 'w-8 h-8'} />}
        </div>
      </motion.div>

      <h3 className={cn(
        'font-bold text-white mb-2',
        isCompact ? 'text-lg' : 'text-xl sm:text-2xl'
      )}>
        {title}
      </h3>

      <p className={cn(
        'text-zinc-400 max-w-md',
        isCompact ? 'text-sm mb-4' : 'text-base mb-6'
      )}>
        {message}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button className="bg-brand-soft hover:bg-brand-soft/80">
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button className="bg-brand-soft hover:bg-brand-soft/80" onClick={action.onClick}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline">
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   SPECIFIC ERROR STATES
   ========================================================================== */

interface SimpleErrorProps {
  onRetry?: () => void
  className?: string
  variant?: 'default' | 'compact' | 'inline'
}

export function NetworkError({ onRetry, className, variant }: SimpleErrorProps) {
  return (
    <ErrorState
      icon={<WifiOff className="w-8 h-8" />}
      title="Pas de connexion"
      message="Vérifie ta connexion internet et réessaie."
      action={onRetry ? { label: 'Réessayer', onClick: onRetry } : undefined}
      className={className}
      variant={variant}
    />
  )
}

export function ServerError({ onRetry, className, variant }: SimpleErrorProps) {
  return (
    <ErrorState
      icon={<ServerCrash className="w-8 h-8" />}
      title="Erreur serveur"
      message="Nos serveurs ont un problème. On s'en occupe !"
      action={onRetry ? { label: 'Réessayer', onClick: onRetry } : undefined}
      secondaryAction={{ label: 'Retour accueil', href: '/teen' }}
      className={className}
      variant={variant}
    />
  )
}

export function NotFoundError({ className, variant }: SimpleErrorProps) {
  return (
    <ErrorState
      icon={<Home className="w-8 h-8" />}
      title="Page introuvable"
      message="Cette page n'existe pas ou a été déplacée."
      action={{ label: 'Retour accueil', href: '/teen' }}
      className={className}
      variant={variant}
    />
  )
}

export function AuthError({ className, variant }: SimpleErrorProps) {
  return (
    <ErrorState
      icon={<ShieldAlert className="w-8 h-8" />}
      title="Accès refusé"
      message="Tu dois être connecté pour voir cette page."
      action={{ label: 'Se connecter', href: '/login' }}
      className={className}
      variant={variant}
    />
  )
}

/* ==========================================================================
   EMPTY STATES
   ========================================================================== */

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center text-center p-8', className)}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-zinc-500"
        >
          {icon}
        </motion.div>
      )}

      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-4">{message}</p>

      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button className="bg-brand-soft hover:bg-brand-soft/80">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button className="bg-brand-soft hover:bg-brand-soft/80" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </motion.div>
  )
}

/* ==========================================================================
   LOADING WITH ERROR FALLBACK
   ========================================================================== */

interface DataStateProps {
  loading: boolean
  error: Error | null
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  onRetry?: () => void
  className?: string
}

export function DataState({ loading, error, children, loadingComponent, onRetry, className }: DataStateProps) {
  if (loading) {
    return <>{loadingComponent || <div className="animate-pulse">Loading...</div>}</>
  }

  if (error) {
    return (
      <ErrorState
        title="Erreur de chargement"
        message={error.message || "Une erreur s'est produite"}
        action={onRetry ? { label: 'Réessayer', onClick: onRetry } : undefined}
        className={className}
        variant="compact"
      />
    )
  }

  return <>{children}</>
}

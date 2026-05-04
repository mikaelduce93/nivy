'use client'

/* ==========================================================================
   DASHBOARD ERROR BOUNDARY - Graceful Degradation
   
   Wraps dashboard components to catch errors and provide:
   - Beautiful error UI with retry option
   - Error logging for monitoring
   - Graceful degradation (show placeholder instead of crash)
   - Component-level isolation (one failure doesn't crash dashboard)
   ========================================================================== */

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, Bug, Wifi, Server, Home, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumButton } from '@/components/ui/button'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface DashboardErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode
  /** Component name for logging */
  componentName?: string
  /** Fallback UI when error occurs */
  fallback?: React.ReactNode
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Whether to show compact error UI */
  compact?: boolean
  /** Custom className */
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  showDetails: boolean
}

type ErrorType = 'network' | 'server' | 'client' | 'unknown'

/* ==========================================================================
   ERROR TYPE DETECTION
   ========================================================================== */

function getErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('500') || message.includes('server') || message.includes('internal')) {
    return 'server'
  }
  if (name.includes('typeerror') || name.includes('referenceerror')) {
    return 'client'
  }
  return 'unknown'
}

const ERROR_CONFIG: Record<ErrorType, { icon: React.ElementType; title: string; description: string; color: string }> = {
  network: {
    icon: Wifi,
    title: 'Problème de connexion',
    description: 'Impossible de charger ce contenu. Vérifiez votre connexion internet.',
    color: 'text-amber-400',
  },
  server: {
    icon: Server,
    title: 'Erreur serveur',
    description: 'Nos serveurs ont rencontré un problème. Réessayez dans quelques instants.',
    color: 'text-orange-400',
  },
  client: {
    icon: Bug,
    title: 'Erreur technique',
    description: 'Une erreur inattendue s\'est produite. Notre équipe en a été informée.',
    color: 'text-red-400',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Quelque chose s\'est mal passé',
    description: 'Une erreur est survenue. Essayez de recharger la page.',
    color: 'text-zinc-400',
  },
}

/* ==========================================================================
   ERROR FALLBACK UI
   ========================================================================== */

interface ErrorFallbackProps {
  error: Error
  errorInfo: React.ErrorInfo | null
  resetError: () => void
  compact?: boolean
  componentName?: string
}

function ErrorFallback({ error, errorInfo, resetError, compact, componentName }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const errorType = getErrorType(error)
  const config = ERROR_CONFIG[errorType]
  const Icon = config.icon
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full min-h-[100px] p-4"
      >
        <div className="flex items-center gap-3 text-zinc-400">
          <Icon className={cn('w-5 h-5', config.color)} />
          <span className="text-sm font-medium">Erreur de chargement</span>
          <button
            onClick={resetError}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Réessayer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-6"
      role="alert"
      aria-live="assertive"
    >
      {/* Animated icon */}
      <motion.div
        className={cn(
          'w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6',
          'relative overflow-hidden'
        )}
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Pulse effect */}
        <motion.div
          className={cn('absolute inset-0 rounded-2xl', config.color.replace('text-', 'bg-'))}
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <Icon className={cn('w-8 h-8 relative z-10', config.color)} />
      </motion.div>
      
      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2">{config.title}</h3>
      
      {/* Description */}
      <p className="text-sm text-zinc-400 max-w-xs mb-6">{config.description}</p>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <PremiumButton
          onClick={resetError}
          variant="lavender"
          size="sm"
          glow
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </PremiumButton>
        
        <PremiumButton
          onClick={() => window.location.href = '/teen'}
          variant="ghost"
          size="sm"
        >
          <Home className="w-4 h-4 mr-2" />
          Accueil
        </PremiumButton>
      </div>
      
      {/* Error details (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 w-full max-w-md">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors mx-auto"
          >
            <span>Détails techniques</span>
            <motion.div
              animate={{ rotate: showDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-left">
                  {componentName && (
                    <p className="text-xs text-zinc-500 mb-2">
                      Component: <code className="text-zinc-400">{componentName}</code>
                    </p>
                  )}
                  <p className="text-xs text-red-400 font-mono break-all">
                    {error.message}
                  </p>
                  {errorInfo?.componentStack && (
                    <pre className="mt-2 text-[10px] text-zinc-500 overflow-auto max-h-32">
                      {errorInfo.componentStack.slice(0, 500)}...
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   ERROR BOUNDARY CLASS
   ========================================================================== */

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log to console in development
    console.error(
      `[DashboardErrorBoundary${this.props.componentName ? ` - ${this.props.componentName}` : ''}]`,
      error,
      errorInfo
    )
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo)
    
    // In production, you would log to an error tracking service here
    // e.g., Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
  }
  
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }
  
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // Use default error fallback
      return (
        <div className={this.props.className}>
          <ErrorFallback
            error={this.state.error!}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            compact={this.props.compact}
            componentName={this.props.componentName}
          />
        </div>
      )
    }
    
    return this.props.children
  }
}

/* ==========================================================================
   FUNCTIONAL WRAPPER
   ========================================================================== */

/**
 * Wraps a component with error boundary (for use with React 18 Suspense)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<DashboardErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DashboardErrorBoundary {...options}>
      <Component {...props} />
    </DashboardErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`
  
  return WrappedComponent
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default DashboardErrorBoundary

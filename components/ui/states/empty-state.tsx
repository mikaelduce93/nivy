'use client'

/**
 * TEENS PARTY MOROCCO - Empty State Component
 * ============================================
 *
 * Premium empty state with animated illustrations,
 * glow effects, and dramatic entry animations.
 */

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Ticket,
  Users,
  Trophy,
  Bell,
  Search,
  FileText,
  Heart,
  Star,
  ShoppingBag,
  Inbox,
  FolderOpen,
  Image,
  MessageSquare,
  Sparkles,
  Coins,
  Activity,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, PremiumButton } from '@/components/ui/button'
import { FloatingParticles, GlowPulse, PALETTES } from '@/components/ui/effects/particle-system'

/* ==========================================================================
   PRESET ILLUSTRATIONS
   ========================================================================== */

const presetIcons: Record<string, LucideIcon> = {
  events: Calendar,
  tickets: Ticket,
  users: Users,
  clubs: Trophy,
  notifications: Bell,
  search: Search,
  documents: FileText,
  favorites: Heart,
  reviews: Star,
  cart: ShoppingBag,
  inbox: Inbox,
  files: FolderOpen,
  photos: Image,
  messages: MessageSquare,
  // Teen-specific presets
  friends: Users,
  coins: Coins,
  feed: Activity,
  quests: Target,
}

const presetMessages: Record<string, { title: string; description: string }> = {
  events: {
    title: 'Aucun événement',
    description: 'Il n\'y a pas encore d\'événements à afficher.',
  },
  tickets: {
    title: 'Aucune réservation',
    description: 'Vous n\'avez pas encore de réservations. Explorez nos événements !',
  },
  users: {
    title: 'Aucun utilisateur',
    description: 'Aucun utilisateur trouvé pour le moment.',
  },
  clubs: {
    title: 'Aucun club',
    description: 'Vous n\'êtes inscrit à aucun club pour le moment.',
  },
  notifications: {
    title: 'Aucune notification',
    description: 'Vous êtes à jour ! Aucune nouvelle notification.',
  },
  search: {
    title: 'Aucun résultat',
    description: 'Aucun résultat ne correspond à votre recherche.',
  },
  documents: {
    title: 'Aucun document',
    description: 'Vous n\'avez pas encore ajouté de documents.',
  },
  favorites: {
    title: 'Aucun favori',
    description: 'Vous n\'avez pas encore de favoris.',
  },
  reviews: {
    title: 'Aucun avis',
    description: 'Aucun avis n\'a encore été laissé.',
  },
  cart: {
    title: 'Panier vide',
    description: 'Votre panier est vide. Ajoutez des articles !',
  },
  inbox: {
    title: 'Boîte de réception vide',
    description: 'Aucun message pour le moment.',
  },
  files: {
    title: 'Aucun fichier',
    description: 'Ce dossier est vide.',
  },
  photos: {
    title: 'Aucune photo',
    description: 'Aucune photo à afficher.',
  },
  messages: {
    title: 'Aucun message',
    description: 'Pas encore de messages — démarre une conversation avec tes potes !',
  },
  // Teen-specific presets
  friends: {
    title: 'Pas encore d\'amis',
    description: 'Invite tes potes pour débloquer le chat, les crews et les défis multi-joueurs.',
  },
  coins: {
    title: 'Pas encore de coins',
    description: 'Termine des quêtes quotidiennes pour earn tes premiers coins et débloquer la boutique.',
  },
  feed: {
    title: 'Ton feed est vide',
    description: 'Suis tes potes et rejoins une crew pour voir leur activité en direct ici.',
  },
  quests: {
    title: 'Aucune quête disponible',
    description: 'Reviens demain pour de nouvelles quêtes ! Le compteur reset chaque jour à minuit.',
  },
}

/* ==========================================================================
   EMPTY STATE COMPONENT
   ========================================================================== */

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

interface EmptyStateProps {
  /** Preset type for automatic icon and messages */
  preset?: keyof typeof presetIcons
  /** Custom icon (overrides preset) */
  icon?: LucideIcon
  /** Title (overrides preset) */
  title?: string
  /** Description (overrides preset) */
  description?: string
  /** Primary action button */
  action?: EmptyStateAction
  /** Secondary action */
  secondaryAction?: EmptyStateAction
  /** Size variant */
  size?: 'small' | 'default' | 'large'
  /** Additional className */
  className?: string
  /** Children for custom content */
  children?: React.ReactNode
}

export function EmptyState({
  preset,
  icon: customIcon,
  title: customTitle,
  description: customDescription,
  action,
  secondaryAction,
  size = 'default',
  className,
  children,
}: EmptyStateProps) {
  // Resolve icon, title, description from preset or custom
  const Icon = customIcon || (preset ? presetIcons[preset] : Inbox)
  const presetData = preset ? presetMessages[preset] : null
  const title = customTitle || presetData?.title || 'Rien à afficher'
  const description = customDescription || presetData?.description || 'Aucun contenu disponible.'

  // Size classes
  const sizeClasses = {
    small: {
      container: 'py-8',
      iconWrapper: 'w-14 h-14',
      icon: 'w-6 h-6',
      title: 'text-base',
      description: 'text-sm',
      particleCount: 8,
    },
    default: {
      container: 'py-12',
      iconWrapper: 'w-20 h-20',
      icon: 'w-9 h-9',
      title: 'text-xl',
      description: 'text-sm',
      particleCount: 12,
    },
    large: {
      container: 'py-20',
      iconWrapper: 'w-28 h-28',
      icon: 'w-12 h-12',
      title: 'text-2xl',
      description: 'text-base',
      particleCount: 18,
    },
  }

  const classes = sizeClasses[size]

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
      },
    },
  }

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center relative',
        classes.container,
        className
      )}
      role="status"
      aria-label={title}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingParticles
          count={classes.particleCount}
          colors={PALETTES.lavender}
          direction="random"
          speed="slow"
          glow={true}
        />
      </div>

      {/* Animated Icon with glow */}
      <motion.div variants={itemVariants} className="relative z-10">
        <GlowPulse color="#8b5cf6" intensity="medium" speed="slow">
          <motion.div
            className={cn(
              'rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 relative overflow-hidden',
              classes.iconWrapper
            )}
            whileHover={{ scale: 1.05, rotate: 5 }}
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
              }}
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            />
            
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-0 border-2 border-gen-z-lavender/20 rounded-2xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            
            <Icon className={cn('text-gen-z-lavender relative z-10', classes.icon)} />
          </motion.div>
        </GlowPulse>
      </motion.div>

      {/* Title with gradient */}
      <motion.h3 
        variants={itemVariants}
        className={cn(
          'font-black text-white mb-2 mt-6 tracking-tight relative z-10',
          classes.title
        )}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p 
        variants={itemVariants}
        className={cn(
          'text-zinc-400 max-w-sm mb-8 relative z-10',
          classes.description
        )}
      >
        {description}
      </motion.p>

      {/* Custom children */}
      {children && (
        <motion.div variants={itemVariants} className="relative z-10">
          {children}
        </motion.div>
      )}

      {/* Actions with glow effect */}
      <AnimatePresence>
        {(action || secondaryAction) && (
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-3 relative z-10"
          >
            {action && (
              action.href ? (
                <Link href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PremiumButton 
                      variant={action.variant === 'outline' ? 'outline' : action.variant === 'ghost' ? 'ghost' : 'lavender'} 
                      size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default'}
                      glow={true}
                      ripple={true}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      {action.label}
                    </PremiumButton>
                  </motion.div>
                </Link>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PremiumButton
                    variant={action.variant === 'outline' ? 'outline' : action.variant === 'ghost' ? 'ghost' : 'lavender'}
                    size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default'}
                    onClick={action.onClick}
                    glow={true}
                    ripple={true}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {action.label}
                  </PremiumButton>
                </motion.div>
              )
            )}
            {secondaryAction && (
              secondaryAction.href ? (
                <Link href={secondaryAction.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant={secondaryAction.variant || 'outline'} 
                      size={size === 'small' ? 'sm' : 'default'}
                    >
                      {secondaryAction.label}
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={secondaryAction.variant || 'outline'}
                    size={size === 'small' ? 'sm' : 'default'}
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.label}
                  </Button>
                </motion.div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

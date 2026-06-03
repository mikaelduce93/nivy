'use client'

/**
 * NIVY — Empty State
 * ==================
 *
 * État vide canonique de l'app (charte paper). Rend la mascotte Niv via
 * `<NivEmpty>` (F4) — plus aucun glow/particule/glass. API conservée pour ne
 * pas casser les ~70 écrans consommateurs.
 */

import * as React from 'react'
import Link from 'next/link'
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
import { Button } from '@/components/ui/button'
import { NivEmpty } from '@/components/brand'
import type { NivMood } from '@/components/brand/niv'

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
    description: 'Termine des quêtes quotidiennes pour gagner tes premiers coins et débloquer la boutique.',
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
  /** Preset type for automatic messages */
  preset?: keyof typeof presetIcons
  /** @deprecated Niv est désormais la mascotte ; l'icône Lucide n'est plus rendue. */
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
  /** Humeur de Niv (défaut `calm` ; `proud`/`hype` pour les états d'amorçage). */
  nivMood?: NivMood
  /** Additional className */
  className?: string
  /** Children for custom content */
  children?: React.ReactNode
}

export function EmptyState({
  preset,
  title: customTitle,
  description: customDescription,
  action,
  secondaryAction,
  size = 'default',
  nivMood = 'calm',
  className,
  children,
}: EmptyStateProps) {
  const presetData = preset ? presetMessages[preset] : null
  const title = customTitle || presetData?.title || 'Rien à afficher'
  const description = customDescription || presetData?.description || 'Aucun contenu disponible.'

  const containerPad = size === 'small' ? 'py-8' : size === 'large' ? 'py-20' : 'py-12'
  const btnSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default'

  const renderBtn = (a: EmptyStateAction, primary: boolean) => {
    const variant =
      a.variant === 'outline' ? 'outline' : a.variant === 'ghost' ? 'ghost' : primary ? 'pink' : 'outline'
    if (a.href) {
      return (
        <Button asChild variant={variant} size={btnSize}>
          <Link href={a.href}>{a.label}</Link>
        </Button>
      )
    }
    return (
      <Button variant={variant} size={btnSize} onClick={a.onClick}>
        {a.label}
      </Button>
    )
  }

  const actionNode =
    action || secondaryAction ? (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {action && renderBtn(action, true)}
        {secondaryAction && renderBtn(secondaryAction, false)}
      </div>
    ) : undefined

  return (
    <div className={cn('flex flex-col items-center', containerPad, className)}>
      <NivEmpty
        mood={nivMood}
        title={title}
        description={description}
        action={actionNode}
        className="w-full max-w-md"
      />
      {children ? <div className="mt-4 w-full max-w-md">{children}</div> : null}
    </div>
  )
}

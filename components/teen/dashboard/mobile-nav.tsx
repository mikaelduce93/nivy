'use client'

/* ==========================================================================
   MOBILE BOTTOM NAVIGATION - Instagram-Style Nav Bar
   
   Floating bottom navigation for mobile devices.
   Only visible on screens < 768px (md breakpoint).
   ========================================================================== */

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Map, Users, User, Compass, Zap, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTapFeedback } from '@/lib/hooks/use-touch-optimized'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  activeColor?: string
  badge?: number
}

interface MobileBottomNavProps {
  /** Additional items to show */
  extraItems?: NavItem[]
  /** Hide on certain paths */
  hiddenPaths?: string[]
  /** Custom className */
  className?: string
}

/* ==========================================================================
   NAV ITEMS
   ========================================================================== */

const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/teen',
    icon: Home,
    activeColor: 'text-brand-soft',
  },
  {
    label: 'Explore',
    href: '/teen/map',
    icon: Map,
    activeColor: 'text-success-soft',
  },
  {
    label: 'Crew',
    href: '/teen/circles',
    icon: Users,
    activeColor: 'text-accent-soft',
  },
  {
    label: 'Profile',
    href: '/teen/profile',
    icon: User,
    activeColor: 'text-gen-z-yellow',
  },
]

/* ==========================================================================
   NAV ITEM COMPONENT
   ========================================================================== */

interface NavItemButtonProps {
  item: NavItem
  isActive: boolean
}

function NavItemButton({ item, isActive }: NavItemButtonProps) {
  const { isTapped, tapProps } = useTapFeedback()
  const Icon = item.icon
  
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center py-2 px-4 min-w-[64px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded-lg'
      )}
      {...tapProps}
    >
      <motion.div
        animate={{
          scale: isTapped ? 0.9 : isActive ? 1.1 : 1,
          y: isActive ? -2 : 0,
        }}
        transition={{ duration: 0.15 }}
        className="relative"
      >
        {/* Active indicator glow */}
        {isActive && (
          <motion.div
            layoutId="mobile-nav-active"
            className={cn(
              'absolute -inset-2 rounded-full blur-lg opacity-30',
              item.activeColor?.replace('text-', 'bg-') || 'bg-brand-soft'
            )}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        
        <Icon
          className={cn(
            'w-6 h-6 transition-colors relative z-10',
            isActive ? item.activeColor || 'text-brand-soft' : 'text-zinc-400'
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
        
        {/* Badge */}
        {item.badge !== undefined && item.badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {item.badge > 9 ? '9+' : item.badge}
          </motion.span>
        )}
      </motion.div>
      
      <span
        className={cn(
          'text-[10px] font-semibold mt-1 transition-colors',
          isActive ? 'text-white' : 'text-zinc-500'
        )}
      >
        {item.label}
      </span>
      
      {/* Active line indicator */}
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className={cn(
            'absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full',
            item.activeColor?.replace('text-', 'bg-') || 'bg-brand-soft'
          )}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  )
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function MobileBottomNav({ 
  extraItems = [], 
  hiddenPaths = ['/teen/chat', '/teen/quests'],
  className,
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = React.useState(true)
  const lastScrollY = React.useRef(0)
  
  const navItems = [...DEFAULT_NAV_ITEMS, ...extraItems]
  
  // Check if current path should hide nav
  const shouldHide = hiddenPaths.some(path => pathname?.startsWith(path))
  
  // Hide on scroll down, show on scroll up
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      lastScrollY.current = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  if (shouldHide) return null
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 md:hidden',
            'safe-area-bottom', // iOS safe area
            className
          )}
          role="navigation"
          aria-label="Navigation principale mobile"
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10" />
          
          {/* Nav items */}
          <div className="relative flex items-center justify-around py-1 px-2">
            {navItems.map((item) => {
              // Check if this is the active path
              const isActive = pathname === item.href || 
                (item.href !== '/teen' && pathname?.startsWith(item.href))
              
              return (
                <NavItemButton
                  key={item.href}
                  item={item}
                  isActive={isActive}
                />
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default MobileBottomNav

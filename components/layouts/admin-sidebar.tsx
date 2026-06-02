'use client'

/**
 * TEENS PARTY MOROCCO - Admin Sidebar Navigation
 * ===============================================
 *
 * Wave 1C: items are filtered by sub-role + (for system entries) by an env
 * flag. Pass `subRole` from the server-side admin layout. The Scripts SQL
 * entry is shown ONLY if `subRole === 'super_admin'` AND
 * `sqlConsoleEnabled === true` (canon: admin-moderation §10 FORBIDDEN #2 +
 * §12.D3 ring-fence).
 */

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Ticket,
  Trophy,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Award,
  Database,
  Cake,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Niv } from '@/components/brand'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { AdminSubRole, AdminPermission } from '@/lib/auth/admin-permissions.matrix'
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions.matrix'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Required permission to render the item. Undefined = always shown. */
  requiredPermission?: AdminPermission
  /** Extra gate: when set, the item is hidden unless the prop is true. */
  requiresEnvFlag?: 'sqlConsole'
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard',     href: '/admin',                icon: LayoutDashboard, requiredPermission: 'dashboard.view' },
  { title: 'Modération',    href: '/admin/moderation',     icon: ShieldAlert,     requiredPermission: 'content.view' },
  { title: 'Événements',    href: '/admin/evenements',     icon: Calendar,        requiredPermission: 'events.view' },
  { title: 'Réservations',  href: '/admin/reservations',   icon: Ticket,          requiredPermission: 'reservations.view' },
  { title: 'Anniversaires', href: '/admin/anniversaires',  icon: Cake,            requiredPermission: 'events.view' },
  { title: 'Check-in',      href: '/admin/check-in',       icon: QrCode,          requiredPermission: 'reservations.checkin' },
  { title: 'Utilisateurs',  href: '/admin/utilisateurs',   icon: Users,           requiredPermission: 'users.view' },
  // Wave 6E — admin/clubs link removed. The legacy admin tree queried
  // the deprecated `public.clubs` table (PGRST205 in prod) and is now a
  // permanentRedirect to /admin until a real sport_clubs admin spec is
  // ratified. Re-add this entry then.
  { title: 'Ambassadeurs',  href: '/admin/ambassadeurs',   icon: Award,           requiredPermission: 'ambassadors.view' },
  { title: 'Analytics',     href: '/admin/analytics',      icon: BarChart3,       requiredPermission: 'analytics.view' },
  { title: 'Scripts SQL',   href: '/admin/scripts-sql',    icon: Database,        requiredPermission: 'system.sql', requiresEnvFlag: 'sqlConsole' },
]

function roleHasPermissionInline(role: AdminSubRole, permission: AdminPermission): boolean {
  const allowed = ADMIN_PERMISSIONS[permission] as readonly AdminSubRole[]
  return allowed?.includes(role) ?? false
}

interface AdminSidebarProps {
  subRole?: AdminSubRole
  sqlConsoleEnabled?: boolean
}

export function AdminSidebar({ subRole, sqlConsoleEnabled = false }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState(false)

  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Defensive: if a caller forgot to pass subRole, fall back to showing
  // dashboard-only (everyone can see it). This avoids leaking nav when the
  // prop is missing — fail closed.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.requiresEnvFlag === 'sqlConsole' && !sqlConsoleEnabled) return false
    if (!item.requiredPermission) return true
    if (!subRole) return item.requiredPermission === 'dashboard.view'
    return roleHasPermissionInline(subRole, item.requiredPermission)
  })

  return (
    <aside
      className={cn(
        // Masquée sous md : en `w-64` fixe non gardée, elle recouvrait ~70% de
        // l'écran mobile sans aucun moyen de la fermer (aucun drawer admin).
        'hidden md:block fixed left-0 top-0 z-40 h-screen bg-paper border-r-2 border-ink transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b-2 border-ink px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <Niv mood="proud" size={32} />
              <span className="font-display font-extrabold tracking-tight text-ink">Nivy Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-mute hover:text-ink"
            aria-label={collapsed ? "Déplier la barre latérale admin" : "Replier la barre latérale admin"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-out',
                      isActive
                        ? 'border-2 border-ink bg-ink font-semibold text-paper shadow-stkr-pink -translate-x-0.5 -translate-y-0.5'
                        : 'text-mute hover:text-ink'
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t-2 border-ink p-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-mute hover:text-ink transition-colors mb-2'
            )}
            title={collapsed ? 'Retour au site' : undefined}
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Retour au site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-coral hover:text-ink transition-colors'
            )}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

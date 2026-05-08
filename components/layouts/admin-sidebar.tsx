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
  Shield,
  QrCode,
  Award,
  Database,
  Cake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { AdminSubRole, AdminPermission } from '@/lib/auth/admin-permissions'
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions'

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
  { title: 'Événements',    href: '/admin/evenements',     icon: Calendar,        requiredPermission: 'events.view' },
  { title: 'Réservations',  href: '/admin/reservations',   icon: Ticket,          requiredPermission: 'reservations.view' },
  { title: 'Anniversaires', href: '/admin/anniversaires',  icon: Cake,            requiredPermission: 'events.view' },
  { title: 'Check-in',      href: '/admin/check-in',       icon: QrCode,          requiredPermission: 'reservations.checkin' },
  { title: 'Utilisateurs',  href: '/admin/utilisateurs',   icon: Users,           requiredPermission: 'users.view' },
  { title: 'Clubs',         href: '/admin/clubs',          icon: Trophy,          requiredPermission: 'events.view' },
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
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
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
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
        <div className="border-t border-border p-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-2'
            )}
            title={collapsed ? 'Retour au site' : undefined}
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Retour au site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors'
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

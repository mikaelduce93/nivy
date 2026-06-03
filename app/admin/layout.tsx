import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { getAdminInfo } from '@/lib/auth/admin-permissions'
import { redirect } from 'next/navigation'
import { AgentFloatingButton } from '@/components/ai/AgentFloatingButton'
import { SkipToContent } from '@/components/ui/skip-to-content'
import { getFeatureFlag } from '@/lib/features/flags'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side admin verification
  const admin = await getAdminInfo()

  if (!admin) {
    // Not an admin, redirect to home or auth
    redirect('/auth/redirect')
  }

  // #63 — legacy AgentSheet/FriendMap IA panel behind an off-by-default flag.
  const legacyAgentEnabled = await getFeatureFlag('legacy_agent_sheet')

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      {/* Admin Sidebar — filtered by sub-role + (for SQL console) env flag. */}
      <AdminSidebar
        subRole={admin.subRole}
        sqlConsoleEnabled={
          process.env.ENABLE_ADMIN_SQL_CONSOLE === 'true' ||
          process.env.ENABLE_ADMIN_SQL_EXECUTION === 'true'
        }
      />

      {/* Main Content - offset by sidebar width */}
      <main
        id="main-content"
        tabIndex={-1}
        className="pl-0 md:pl-64 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300 outline-none"
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
      {legacyAgentEnabled && <AgentFloatingButton role="admin" context={admin} />}
    </div>
  )
}

import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { getAdminInfo } from '@/lib/auth/admin-permissions'
import { redirect } from 'next/navigation'
import { AgentFloatingButton } from '@/components/ai/AgentFloatingButton'
import { SkipToContent } from '@/components/ui/skip-to-content'

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

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content - offset by sidebar width */}
      <main
        id="main-content"
        tabIndex={-1}
        className="pl-64 transition-all duration-300 outline-none"
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
      <AgentFloatingButton role="admin" context={admin} />
    </div>
  )
}

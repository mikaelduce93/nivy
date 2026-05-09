/**
 * Wave 4A — admin sidebar shows /admin/moderation per role; scripts-sql is
 * hidden by default.
 */
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { AdminSidebar } from "@/components/layouts/admin-sidebar"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { signOut: vi.fn(async () => null) },
  })),
}))

function visibleHrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1])
}

describe("AdminSidebar (Wave 4A)", () => {
  it("moderator sees /admin/moderation", () => {
    const html = renderToString(<AdminSidebar subRole="moderator" />)
    const hrefs = visibleHrefs(html)
    expect(hrefs).toContain("/admin/moderation")
  })

  it("admin sees /admin/moderation", () => {
    const html = renderToString(<AdminSidebar subRole="admin" />)
    expect(visibleHrefs(html)).toContain("/admin/moderation")
  })

  it("support does NOT see /admin/moderation (no content.view permission)", () => {
    const html = renderToString(<AdminSidebar subRole="support" />)
    expect(visibleHrefs(html)).not.toContain("/admin/moderation")
  })

  it("scripts-sql is hidden when sqlConsoleEnabled=false (default)", () => {
    const html = renderToString(<AdminSidebar subRole="super_admin" sqlConsoleEnabled={false} />)
    expect(visibleHrefs(html)).not.toContain("/admin/scripts-sql")
  })

  it("scripts-sql visible only when super_admin AND sqlConsoleEnabled=true", () => {
    const enabled = renderToString(
      <AdminSidebar subRole="super_admin" sqlConsoleEnabled={true} />,
    )
    expect(visibleHrefs(enabled)).toContain("/admin/scripts-sql")

    // Plain admin with the env flag still must NOT see it (perm gate).
    const adminWithFlag = renderToString(
      <AdminSidebar subRole="admin" sqlConsoleEnabled={true} />,
    )
    expect(visibleHrefs(adminWithFlag)).not.toContain("/admin/scripts-sql")
  })

  it("no missing-prop fallback leaks moderation link", () => {
    const html = renderToString(<AdminSidebar />)
    const hrefs = visibleHrefs(html)
    // Defensive: when no subRole is passed, only dashboard.view items render.
    expect(hrefs).toContain("/admin")
    expect(hrefs).not.toContain("/admin/moderation")
    expect(hrefs).not.toContain("/admin/scripts-sql")
  })
})

import { redirect } from "next/navigation"

/**
 * /admin/content — consolidated into the real moderation inbox (#58).
 *
 * This route used to render a 100% fake content-moderation UI (hardcoded fake
 * minors, toast-only handlers, no DB writes). Per canon
 * (docs/canon/admin-moderation.locked.md) the canonical surface for user-content
 * moderation is /admin/moderation, backed by the real `moderation_queue`. We
 * redirect here instead of serving the mock. The old mock is preserved (not
 * deleted) in `_content-mock.deprecated.tsx`.
 */
export default function AdminContentPage() {
  redirect("/admin/moderation")
}

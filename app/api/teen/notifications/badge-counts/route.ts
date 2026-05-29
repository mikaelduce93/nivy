import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * #62 — role-scoped unread notification counts for the teen MobileDock badges.
 * Quests = unread user_notifications whose template category is 'challenge';
 * Social = category 'social'. Uses the authenticated server client so RLS
 * scopes counts to auth.uid() (never service-role). Replaces the dock's
 * hardcoded { quests: 3, social: 2 } mock.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ quests: 0, social: 0 }, { status: 401 })
    }

    // notification_templates is reference data; map category → template ids.
    const { data: templates } = await supabase
      .from("notification_templates")
      .select("id, category")
      .in("category", ["challenge", "social"])

    const idsFor = (cat: string) =>
      (templates || []).filter((t) => t.category === cat).map((t) => t.id)

    const unreadCount = async (ids: string[]): Promise<number> => {
      if (ids.length === 0) return 0
      const { count } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .in("template_id", ids)
      return count || 0
    }

    const [quests, social] = await Promise.all([
      unreadCount(idsFor("challenge")),
      unreadCount(idsFor("social")),
    ])

    return NextResponse.json({ quests, social })
  } catch {
    // Non-critical: badges simply show nothing on failure.
    return NextResponse.json({ quests: 0, social: 0 })
  }
}

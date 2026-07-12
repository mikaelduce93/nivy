import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Initialize Supabase Admin Client (canonical service-role helper)
const supabase = createServiceRoleClient()

export async function generateSystemActivity() {
  console.log('Generating system activity...')

  // Check recent activity count (last 2 hours) on the canonical feed table.
  // The original `.from('social_activities')` targeted a table that never
  // existed in the schema (migration 018 defines `user_activities`), so this
  // cron threw on every run. The real feed table is `user_activities`.
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('user_activities')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', twoHoursAgo)

  // If plenty of activity, don't spam
  if (count && count > 5) {
    console.log('Feed is active, skipping system generation.')
    return
  }

  // A system/bot promo post cannot be persisted against the live schema:
  // `user_activities.user_id` is a NOT NULL FK to auth.users and
  // `activity_type_id` is a NOT NULL FK to activity_types (migration 018).
  // Neither a system/bot auth user nor a system/announcement activity type is
  // seeded, so there is no valid row to insert. The removed insert used a fake
  // `user_id: 'bot_admin'` plus non-existent `type`/`metadata` columns and
  // therefore failed on every invocation. Seeding a system author + a dedicated
  // activity type is a product decision; until then this cron only measures
  // feed activity and does not write.
  console.log('No system author / activity type seeded — skipping system post.')
}

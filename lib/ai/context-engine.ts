import { createClient } from "@/lib/supabase/server"

export interface AgentContext {
  role: string
  userId: string
  location?: { lat: number; lng: number }
  currentPage?: string
  data: Record<string, any>
  timestamp: string
}

// XP level calculation helper
function calculateLevelProgress(totalXp: number) {
  let level = 1
  let xpRequired = 0
  let xpForNext = Math.floor(100 * level * 1.5)

  while (totalXp >= xpRequired + xpForNext) {
    xpRequired += xpForNext
    level += 1
    xpForNext = Math.floor(100 * level * 1.5)
  }

  const xpInLevel = Math.max(0, totalXp - xpRequired)
  const progressPercent = xpForNext > 0 ? Math.round((xpInLevel / xpForNext) * 100) : 0

  return { level, xpToNextLevel: xpForNext, xpInLevel, progressPercent }
}

export class ContextEngine {
  
  static async gatherContext(role: string, userId: string, currentPage: string): Promise<AgentContext> {
    const supabase = await createClient()
    const baseContext: AgentContext = {
      role,
      userId,
      currentPage,
      data: {},
      timestamp: new Date().toISOString()
    }

    try {
      switch (role) {
        case 'teen':
          baseContext.data = await this.gatherTeenContext(supabase, userId)
          break
        case 'parent':
          baseContext.data = await this.gatherParentContext(supabase, userId)
          break
        case 'partner':
          baseContext.data = await this.gatherPartnerContext(supabase, userId)
          break
        case 'ambassador':
          baseContext.data = await this.gatherAmbassadorContext(supabase, userId)
          break
        case 'admin':
          baseContext.data = await this.gatherAdminContext(supabase, userId)
          break
      }
    } catch (error) {
      console.error(`[ContextEngine] Error gathering ${role} context:`, error)
      baseContext.data = { error: 'Failed to gather context', fallback: true }
    }

    return baseContext
  }

  private static async gatherTeenContext(supabase: any, userId: string) {
    // Parallel fetch for better performance
    const [
      profileResult,
      teenProfileResult,
      xpResult,
      streakResult,
      challengesResult,
      eventsResult,
      presenceResult
    ] = await Promise.all([
      // 1. Basic profile
      supabase
        .from('profiles')
        .select('full_name, city, avatar_url')
        .eq('id', userId)
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null })),
      
      // 2. Teen profile with coins
      supabase
        .from('teen_full_profile')
        .select('coins_balance, level, title, first_name')
        .eq('id', userId)
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null })),
      
      // 3. XP data
      supabase
        .from('user_xp')
        .select('total_xp, level')
        .eq('teen_id', userId)
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null })),
      
      // 4. Streak data
      supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('teen_id', userId)
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null })),
      
      // 5. Active challenges (pending or in progress)
      supabase
        .from('user_challenges')
        .select('id, status, challenge:challenge_id(title, xp_reward)')
        .eq('teen_id', userId)
        .in('status', ['pending', 'in_progress'])
        .limit(5)
        .catch(() => ({ data: [] })),
      
      // 6. Nearby events (upcoming)
      supabase
        .from('events')
        .select('id, title, event_date, venue, city')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(3)
        .catch(() => ({ data: [] })),
      
      // 7. Presence (friends online)
      supabase
        .rpc('get_friends_presence', { p_user_id: userId })
        .catch(() => ({ data: [] }))
    ])

    const profile = profileResult?.data
    const teenProfile = teenProfileResult?.data
    const xpData = xpResult?.data
    const streakData = streakResult?.data
    const activeChallenges = challengesResult?.data || []
    const upcomingEvents = eventsResult?.data || []
    const friendsPresence = presenceResult?.data || []

    // Calculate level progress
    const totalXp = xpData?.total_xp || 0
    const levelProgress = calculateLevelProgress(totalXp)
    const onlineFriends = friendsPresence.filter((f: any) => f.status !== 'offline').length

    return {
      profile: {
        name: profile?.full_name || teenProfile?.first_name || 'Teen',
        city: profile?.city,
        avatar: profile?.avatar_url,
      },
      gamification: {
        coins: teenProfile?.coins_balance || 0,
        level: levelProgress.level,
        totalXp,
        streak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        nextLevelProgress: levelProgress.progressPercent,
        xpToNextLevel: levelProgress.xpToNextLevel,
      },
      activeQuests: activeChallenges.length,
      questDetails: activeChallenges.map((c: any) => ({
        title: c.challenge?.title,
        xp: c.challenge?.xp_reward,
        status: c.status,
      })),
      nearbyEventsCount: upcomingEvents.length,
      nearbyEvents: upcomingEvents.map((e: any) => ({
        title: e.title,
        date: e.event_date,
        venue: e.venue,
      })),
      social: {
        onlineFriendsCount: onlineFriends,
        totalFriendsPresent: friendsPresence.length,
      }
    }
  }

  private static async gatherParentContext(supabase: any, userId: string) {
    const { data: links } = await supabase
      .from('parent_teen_links')
      .select('teen_id')
      .eq('parent_id', userId)
      .eq('status', 'active')
      .catch(() => ({ data: [] }))

    const teenIds = (links || []).map((link: any) => link.teen_id)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [
      approvalsResult,
      transactionsResult,
      budgetsResult,
      profilesResult
    ] = await Promise.all([
      // 1. Pending approvals
      supabase
        .from('booking_approval_requests')
        .select('id')
        .eq('parent_id', userId)
        .eq('status', 'pending')
        .catch(() => ({ data: [] })),

      // 2. Budget usage (this month)
      teenIds.length
        ? supabase
            .from('transactions')
            .select('amount')
            .in('teen_id', teenIds)
            .gte('created_at', monthStart)
            .catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),

      // 3. Budget limits
      teenIds.length
        ? supabase
            .from('teen_budget_limits')
            .select('teen_id, monthly_limit')
            .in('teen_id', teenIds)
            .catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),

      // 4. Teen names
      teenIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', teenIds)
            .catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] })
    ])

    const pendingApprovals = approvalsResult?.data || []
    const transactions = transactionsResult?.data || []
    const budgets = budgetsResult?.data || []
    const profiles = profilesResult?.data || []

    const nameById = new Map(
      profiles.map((profile: any) => [profile.id, profile.full_name])
    )
    const budgetByTeen = new Map(
      budgets.map((budget: any) => [budget.teen_id, budget.monthly_limit])
    )

    // Calculate monthly spending
    const monthlySpent = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

    return {
      childrenCount: teenIds.length,
      children: teenIds.map((teenId: string) => ({
        id: teenId,
        name: nameById.get(teenId) || 'Teen',
        spendingLimit: budgetByTeen.get(teenId) ?? null,
        controlLevel: null,
      })),
      pendingApprovals: pendingApprovals.length,
      monthlyBudgetSpent: monthlySpent,
      alerts: [] // Could fetch from notifications table
    }
  }

  private static async gatherPartnerContext(supabase: any, userId: string) {
    // Get partner venue first
    const { data: partnerProfile } = await supabase
      .from('partner_venues')
      .select('id, name, city')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle()
      .catch(() => ({ data: null }))

    if (!partnerProfile) {
      return { error: 'No partner venue found', fallback: true }
    }

    const venueId = partnerProfile.id

    // Parallel fetch
    const [
      checkinsResult,
      offersResult,
      reservationsResult
    ] = await Promise.all([
      // Today's check-ins
      supabase
        .from('check_ins')
        .select('id')
        .eq('venue_id', venueId)
        .gte('check_in_time', new Date().toISOString().split('T')[0])
        .catch(() => ({ data: [] })),
      
      // Active offers
      supabase
        .from('partner_offers')
        .select('id, title, discount_percent')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .catch(() => ({ data: [] })),
      
      // Upcoming reservations
      supabase
        .from('bookings')
        .select('id')
        .eq('venue_id', venueId)
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .eq('status', 'confirmed')
        .catch(() => ({ data: [] }))
    ])

    return {
      venue: {
        name: partnerProfile.name,
        city: partnerProfile.city,
      },
      todayCheckins: checkinsResult?.data?.length || 0,
      activeOffers: offersResult?.data?.length || 0,
      offerDetails: offersResult?.data?.map((o: any) => ({
        title: o.title,
        discount: o.discount_percent,
      })) || [],
      upcomingReservations: reservationsResult?.data?.length || 0
    }
  }

  private static async gatherAmbassadorContext(supabase: any, userId: string) {
    // Parallel fetch
    const [
      ambassadorResult,
      referralsResult,
      commissionsResult
    ] = await Promise.all([
      // Ambassador profile
      supabase
        .from('ambassadors')
        .select('id, referral_code, total_earnings, current_rank')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
        .catch(() => ({ data: null })),
      
      // Referral count
      supabase
        .from('referrals')
        .select('id')
        .eq('referred_by', userId)
        .catch(() => ({ data: [] })),
      
      // This month's commissions
      supabase
        .from('ambassador_commissions')
        .select('amount')
        .eq('ambassador_id', userId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .catch(() => ({ data: [] }))
    ])

    const ambassador = ambassadorResult?.data
    const referrals = referralsResult?.data || []
    const commissions = commissionsResult?.data || []

    const currentMonthCommission = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

    return {
      referralCode: ambassador?.referral_code,
      currentRank: ambassador?.current_rank || 'Bronze',
      totalEarnings: ambassador?.total_earnings || 0,
      currentMonthCommission,
      referralCount: referrals.length,
      activeCampaigns: [] // Could fetch from campaigns table
    }
  }

  private static async gatherAdminContext(supabase: any, userId: string) {
    // Parallel fetch admin stats
    const [
      usersResult,
      ticketsResult,
      flaggedResult
    ] = await Promise.all([
      // Daily active users (logged in today)
      supabase
        .from('profiles')
        .select('id')
        .gte('updated_at', new Date().toISOString().split('T')[0])
        .catch(() => ({ data: [] })),
      
      // Pending support tickets
      supabase
        .from('support_tickets')
        .select('id')
        .eq('status', 'open')
        .catch(() => ({ data: [] })),
      
      // Flagged content
      supabase
        .from('content_reports')
        .select('id')
        .eq('status', 'pending')
        .catch(() => ({ data: [] }))
    ])

    return {
      systemStatus: "Healthy",
      dailyActiveUsers: usersResult?.data?.length || 0,
      pendingTickets: ticketsResult?.data?.length || 0,
      flaggedContent: flaggedResult?.data?.length || 0
    }
  }
}

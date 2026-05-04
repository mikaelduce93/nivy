import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface InsightAlert {
  id: string
  type: 'warning' | 'info' | 'success' | 'ai'
  priority: number
  message: string
  detail?: string
  action?: {
    label: string
    href: string
  }
}

export async function GET() {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const insights: InsightAlert[] = []
    
    // 1. Get linked teens
    const { data: links, error: linksError } = await supabase
      .from('parent_teen_links')
      .select('teen_id')
      .eq('parent_id', user.id)
      .eq('status', 'active')
    
    if (linksError || !links || links.length === 0) {
      insights.push({
        id: 'no-children',
        type: 'info',
        priority: 10,
        message: 'Ajoutez votre premier enfant pour commencer',
        action: { label: 'Ajouter', href: '/parent/teens/add' }
      })
      
      return NextResponse.json({ success: true, insights })
    }

    const teenIds = links.map((link) => link.teen_id)

    // 2. Fetch teen names + budgets + pending approvals
    const [teensResult, budgetsResult, pendingApprovalsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teenIds),
      supabase
        .from('teen_budget_limits')
        .select('teen_id, monthly_limit')
        .in('teen_id', teenIds),
      supabase
        .from('booking_approval_requests')
        .select('id, event:event_id(title)')
        .eq('parent_id', user.id)
        .eq('status', 'pending')
        .limit(5)
    ])

    const teenNameById = new Map(
      (teensResult.data || []).map((teen) => [teen.id, teen.full_name])
    )
    const budgetByTeen = new Map(
      (budgetsResult.data || []).map((budget) => [budget.teen_id, budget.monthly_limit])
    )
    
    const pendingApprovals = pendingApprovalsResult.data || []

    if (pendingApprovals.length > 0) {
      insights.push({
        id: 'pending-approvals',
        type: 'warning',
        priority: 9,
        message: `${pendingApprovals.length} demande${pendingApprovals.length > 1 ? 's' : ''} d'approbation en attente`,
        detail: pendingApprovals.length === 1 
          ? (pendingApprovals[0].event as any)?.title 
          : undefined,
        action: { label: 'Voir', href: '/parent/approvals' }
      })
    }

    // 3. Check budget usage for each child
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    
    for (const child of links) {
      const teenName = teenNameById.get(child.teen_id) || 'Votre enfant'
      const spendingLimit = budgetByTeen.get(child.teen_id) || 1000
      
      // Get this month's spending
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('teen_id', child.teen_id)
        .gte('created_at', startOfMonth)
      
      const totalSpent = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0)
      const spentPercent = Math.round((totalSpent / spendingLimit) * 100)
      
      if (spentPercent >= 90) {
        insights.push({
          id: `budget-critical-${child.teen_id}`,
          type: 'warning',
          priority: 8,
          message: `${teenName} a utilisé ${spentPercent}% du budget mensuel`,
          detail: `${totalSpent} / ${spendingLimit} MAD`,
          action: { label: 'Gérer', href: `/parent/budget/${child.teen_id}` }
        })
      } else if (spentPercent >= 70) {
        insights.push({
          id: `budget-warning-${child.teen_id}`,
          type: 'info',
          priority: 5,
          message: `${teenName} a utilisé ${spentPercent}% du budget`,
          detail: `${totalSpent} / ${spendingLimit} MAD`
        })
      }
    }

    // 4. Check for streak achievements
    for (const child of links) {
      const teenName = teenNameById.get(child.teen_id) || 'Votre enfant'
      
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('teen_id', child.teen_id)
        .maybeSingle()
      
      if (streak && streak.current_streak >= 7) {
        insights.push({
          id: `streak-${child.teen_id}`,
          type: 'success',
          priority: 3,
          message: `${teenName} a un streak de ${streak.current_streak} jours !`,
          detail: 'Belle régularité dans l\'app'
        })
      }
    }

    // 5. AI-powered insight (placeholder for ML model)
    // In production, this would call a recommendation engine
    if (links.length > 0 && insights.filter(i => i.type === 'warning').length === 0) {
      insights.push({
        id: 'ai-tip',
        type: 'ai',
        priority: 2,
        message: 'Conseil IA: Pensez à définir des objectifs hebdomadaires',
        detail: 'Les enfants avec des objectifs progressent 40% plus vite',
        action: { label: 'Créer', href: '/parent/goals' }
      })
    }

    // 6. Sort by priority and limit
    const sortedInsights = insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)

    return NextResponse.json({ 
      success: true, 
      insights: sortedInsights,
      count: sortedInsights.length
    })
    
  } catch (error: any) {
    console.error('[Parent Insights] Error:', error)
    
    // Return fallback
    return NextResponse.json({ 
      success: true, 
      insights: [
        {
          id: 'fallback',
          type: 'info',
          priority: 1,
          message: 'Bienvenue ! Explorez les fonctionnalités parentales.',
          action: { label: 'Guide', href: '/parent/guide' }
        }
      ],
      count: 1,
      fallback: true
    })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    
    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get shop items
    const { data: items, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching shop items:', error)
      // Return fallback data
      return NextResponse.json({
        items: [
          { id: "1", name: "McDonald's Coupon", xp_cost: 500, image: "🍔", category: "Food" },
          { id: "2", name: "Cinema Ticket", xp_cost: 750, image: "🎬", category: "Entertainment" },
          { id: "3", name: "Spotify 1 Month", xp_cost: 1000, image: "🎵", category: "Digital" },
          { id: "4", name: "Nike Voucher", xp_cost: 2000, image: "👟", category: "Fashion" },
        ],
        featured: {
          id: "featured",
          name: "AirPods Pro",
          xp_cost: 10000,
          image: "🎧",
          category: "Tech",
          description: "Limited edition reward",
        },
      })
    }

    // Get featured item
    const featured = items?.find(item => item.featured) || items?.[0]
    const regularItems = items?.filter(item => !item.featured) || []

    return NextResponse.json({
      items: regularItems.map(item => ({
        id: item.id,
        name: item.name,
        xp_cost: item.xp_cost,
        image: item.image || '🎁',
        category: item.category,
        description: item.description,
        stock: item.stock,
      })),
      featured: featured ? {
        id: featured.id,
        name: featured.name,
        xp_cost: featured.xp_cost,
        image: featured.image || '🎧',
        category: featured.category,
        description: featured.description,
      } : null,
    })
  } catch (error) {
    console.error('Error in shop API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Purchase item
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    
    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teenId = userInfo.teenData?.id
    if (!teenId) {
      return NextResponse.json({ error: 'Teen ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get item
    const { data: item, error: itemError } = await supabase
      .from('shop_items')
      .select('*')
      .eq('id', itemId)
      .eq('active', true)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check user's XP
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('total_xp')
      .eq('user_id', teenId)
      .single()

    const userXp = xpData?.total_xp || 0
    if (userXp < item.xp_cost) {
      return NextResponse.json({ error: 'Insufficient XP' }, { status: 400 })
    }

    // Deduct XP
    const { error: deductError } = await supabase.rpc('deduct_user_xp', {
      p_user_id: teenId,
      p_xp_amount: item.xp_cost,
      p_reason: `Purchased ${item.name}`,
    })

    if (deductError) {
      console.error('Failed to deduct XP:', deductError)
      return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
    }

    // Create purchase record
    await supabase.from('shop_purchases').insert({
      user_id: teenId,
      item_id: itemId,
      xp_spent: item.xp_cost,
      status: 'completed',
    })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: teenId,
      type: 'purchase',
      title: 'Achat réussi !',
      body: `Tu as obtenu ${item.name}`,
    })

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
      },
      xpSpent: item.xp_cost,
    })
  } catch (error) {
    console.error('Error in shop purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

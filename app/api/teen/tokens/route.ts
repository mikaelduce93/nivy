/**
 * API TOKENS & REWARDS
 * ====================
 * Gestion des tokens et récompenses
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Récupérer infos tokens
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "wallet"

    switch (type) {
      // Wallet complet
      case "wallet": {
        const { data: wallet, error } = await supabase.rpc("get_user_wallet", {
          p_teen_id: user.id,
        })

        if (error) throw error

        return NextResponse.json({ wallet })
      }

      // Soldes uniquement
      case "balances": {
        const { data: coins, error } = await supabase
          .from("user_coins")
          .select("balance, premium_tokens, seasonal_tokens, token_multiplier, lifetime_earned, lifetime_spent")
          .eq("teen_id", user.id)
          .single()

        if (error && error.code !== "PGRST116") throw error

        return NextResponse.json({
          balances: {
            regular: coins?.balance || 0,
            premium: coins?.premium_tokens || 0,
            seasonal: coins?.seasonal_tokens || 0,
          },
          multiplier: coins?.token_multiplier || 1.0,
          stats: {
            earned: coins?.lifetime_earned || 0,
            spent: coins?.lifetime_spent || 0,
          },
        })
      }

      // Historique des transactions
      case "transactions": {
        const limit = parseInt(searchParams.get("limit") || "20")
        const offset = parseInt(searchParams.get("offset") || "0")
        const tokenType = searchParams.get("token_type")

        let query = supabase
          .from("token_transactions")
          .select("*")
          .eq("teen_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (tokenType) {
          query = query.eq("token_type", tokenType)
        }

        const { data: transactions, error } = await query

        if (error) throw error

        return NextResponse.json({
          transactions: transactions || [],
          has_more: (transactions?.length || 0) === limit,
        })
      }

      // Récompenses disponibles
      case "rewards": {
        const category = searchParams.get("category")
        const affordable = searchParams.get("affordable") === "true"

        let query = supabase
          .from("token_rewards")
          .select("*")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("token_cost", { ascending: true })

        if (category) {
          query = query.eq("category", category)
        }

        const { data: rewards, error } = await query

        if (error) throw error

        // Si affordable, filtrer côté client
        let filteredRewards = rewards || []
        if (affordable) {
          const { data: coins } = await supabase
            .from("user_coins")
            .select("balance, premium_tokens")
            .eq("teen_id", user.id)
            .single()

          if (coins) {
            filteredRewards = filteredRewards.filter((r) => {
              if (r.token_type === "premium") {
                return (coins.premium_tokens || 0) >= r.token_cost
              }
              return (coins.balance || 0) >= r.token_cost
            })
          }
        }

        return NextResponse.json({ rewards: filteredRewards })
      }

      // Sources de tokens
      case "sources": {
        const { data: sources, error } = await supabase
          .from("token_sources")
          .select("*")
          .eq("is_active", true)
          .order("base_amount", { ascending: false })

        if (error) throw error

        // Récupérer les limites de l'utilisateur
        const { data: limits } = await supabase
          .from("token_limits_tracking")
          .select("source_code, daily_count, weekly_count, last_used_at")
          .eq("teen_id", user.id)

        const limitsMap = new Map(
          (limits || []).map((l) => [l.source_code, l])
        )

        const sourcesWithLimits = (sources || []).map((s) => ({
          ...s,
          user_daily_count: limitsMap.get(s.code)?.daily_count || 0,
          user_weekly_count: limitsMap.get(s.code)?.weekly_count || 0,
          last_used: limitsMap.get(s.code)?.last_used_at,
        }))

        return NextResponse.json({ sources: sourcesWithLimits })
      }

      // Bonus quotidien status
      case "daily": {
        const { data: daily, error } = await supabase
          .from("daily_bonuses")
          .select("*")
          .eq("teen_id", user.id)
          .single()

        if (error && error.code !== "PGRST116") throw error

        const today = new Date().toISOString().split("T")[0]

        return NextResponse.json({
          daily: {
            streak: daily?.login_streak || 0,
            claimed_today: daily?.last_login_date === today,
            last_claim: daily?.last_login_date,
            next_streak_bonus: 7 - ((daily?.login_streak || 0) % 7),
          },
        })
      }

      // Mes rédemptions
      case "redemptions": {
        const status = searchParams.get("status")

        let query = supabase
          .from("token_redemptions")
          .select(`
            *,
            reward:token_rewards (id, name, description, icon, category)
          `)
          .eq("teen_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (status) {
          query = query.eq("status", status)
        }

        const { data: redemptions, error } = await query

        if (error) throw error

        return NextResponse.json({ redemptions: redemptions || [] })
      }

      // Transferts
      case "transfers": {
        const { data: transfers, error } = await supabase
          .from("token_transfers")
          .select(`
            *,
            sender:users!sender_id (id, username, display_name, avatar_url),
            receiver:users!receiver_id (id, username, display_name, avatar_url)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        return NextResponse.json({ transfers: transfers || [] })
      }

      // Types de tokens
      case "types": {
        const { data: types, error } = await supabase
          .from("token_types")
          .select("*")
          .eq("is_active", true)

        if (error) throw error

        return NextResponse.json({ types: types || [] })
      }

      default:
        return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Tokens GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Actions sur les tokens — Wave 6C deprecation.
//
// Every action below previously called a phantom RPC (`claim_daily_bonus`,
// `add_tokens_to_user`, `spend_tokens`, `transfer_tokens`) that does NOT
// exist in the DB. Each call silently no-ops, returns `success: true` from
// the optimistic UI, and gives the user fake-XP / fake-tokens that never
// land in `user_coins`. Plus the redeem branch wrote to deprecated
// `token_rewards` / `token_redemptions` tables.
//
// Per founder rule "no fake XP / no fake economy", the entire mutation
// surface is gone. Canonical replacements:
//   - daily bonus              → /teen/quests daily mission (canonical)
//   - earn / redeem            → /teen/wallet?tab=shop + `purchase_reward` RPC
//   - transfer / exchange      → not in scope; was an unannounced parallel rail
//
// GET endpoints (read-only wallet/balances/transactions/redemptions) stay
// live since they read from the canonical `user_coins` table and the
// `get_user_wallet` RPC; the legacy displays will return whatever the
// canonical rails contain (i.e. honest balances, not fake tokens).
function deprecated(action?: string) {
  return NextResponse.json(
    {
      error: "deprecated",
      message:
        "Token mutations are deprecated. Use /teen/wallet?tab=shop for purchases (purchase_reward RPC) and /teen/quests for daily activities (add_xp_to_user RPC).",
      action: action ?? null,
    },
    { status: 410 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    return deprecated((body as { action?: string }).action)
  } catch (error) {
    console.error("Tokens POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

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

// POST: Actions sur les tokens
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      // Réclamer le bonus quotidien
      case "claim_daily": {
        const { data: result, error } = await supabase.rpc("claim_daily_bonus", {
          p_teen_id: user.id,
        })

        if (error) throw error

        return NextResponse.json(result)
      }

      // Gagner des tokens (depuis une activité)
      case "earn": {
        const { source_code, source_id, amount, description } = body

        if (!source_code) {
          return NextResponse.json({ error: "source_code requis" }, { status: 400 })
        }

        const { data: result, error } = await supabase.rpc("add_tokens_to_user", {
          p_teen_id: user.id,
          p_amount: amount || 0,
          p_source_code: source_code,
          p_token_type: "regular",
          p_source_id: source_id,
          p_description: description,
        })

        if (error) throw error

        return NextResponse.json(result)
      }

      // Échanger une récompense
      case "redeem": {
        const { reward_id, shipping_address } = body

        if (!reward_id) {
          return NextResponse.json({ error: "reward_id requis" }, { status: 400 })
        }

        // Récupérer la récompense
        const { data: reward, error: rewardError } = await supabase
          .from("token_rewards")
          .select("*")
          .eq("id", reward_id)
          .eq("is_active", true)
          .single()

        if (rewardError || !reward) {
          return NextResponse.json({ error: "Récompense non trouvée" }, { status: 404 })
        }

        // Vérifier le stock
        if (reward.stock_type !== "unlimited" && (reward.stock_remaining || 0) <= 0) {
          return NextResponse.json({ error: "Rupture de stock" }, { status: 400 })
        }

        // Vérifier si besoin d'adresse
        if (reward.requires_shipping && !shipping_address) {
          return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 })
        }

        // Dépenser les tokens
        const { data: spendResult, error: spendError } = await supabase.rpc("spend_tokens", {
          p_teen_id: user.id,
          p_amount: reward.token_cost,
          p_token_type: reward.token_type || "regular",
          p_reason: `Échange: ${reward.name}`,
          p_reference_id: reward_id,
        })

        if (spendError) throw spendError

        if (!spendResult?.success) {
          return NextResponse.json({
            error: spendResult?.error || "Erreur lors du paiement",
            current_balance: spendResult?.current_balance,
          }, { status: 400 })
        }

        // Créer la rédemption
        const { data: redemption, error: redemptionError } = await supabase
          .from("token_redemptions")
          .insert({
            teen_id: user.id,
            reward_id,
            tokens_spent: reward.token_cost,
            token_type: reward.token_type,
            status: reward.requires_shipping ? "pending" : "completed",
            shipping_address: shipping_address || null,
            redemption_code: reward.category === "digital"
              ? `${reward_id.substring(0, 8)}-${Date.now().toString(36)}`
              : null,
          })
          .select()
          .single()

        if (redemptionError) throw redemptionError

        // Décrémenter le stock
        if (reward.stock_type !== "unlimited") {
          await supabase
            .from("token_rewards")
            .update({ stock_remaining: (reward.stock_remaining || 1) - 1 })
            .eq("id", reward_id)
        }

        return NextResponse.json({
          success: true,
          redemption,
          new_balance: spendResult.new_balance,
        })
      }

      // Transférer des tokens
      case "transfer": {
        const { receiver_username, amount, token_type = "regular", message } = body

        if (!receiver_username || !amount) {
          return NextResponse.json(
            { error: "receiver_username et amount requis" },
            { status: 400 }
          )
        }

        if (amount < 10) {
          return NextResponse.json(
            { error: "Minimum 10 tokens pour un transfert" },
            { status: 400 }
          )
        }

        // Trouver le destinataire
        const { data: receiver, error: receiverError } = await supabase
          .from("users")
          .select("id")
          .eq("username", receiver_username)
          .single()

        if (receiverError || !receiver) {
          return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
        }

        if (receiver.id === user.id) {
          return NextResponse.json(
            { error: "Tu ne peux pas te transférer des tokens" },
            { status: 400 }
          )
        }

        const { data: result, error } = await supabase.rpc("transfer_tokens", {
          p_sender_id: user.id,
          p_receiver_id: receiver.id,
          p_amount: amount,
          p_token_type: token_type,
          p_message: message,
        })

        if (error) throw error

        if (!result?.success) {
          return NextResponse.json({
            error: result?.error || "Erreur lors du transfert",
          }, { status: 400 })
        }

        // Notification au destinataire
        await supabase.from("notifications").insert({
          user_id: receiver.id,
          type: "token_received",
          title: "Tokens reçus!",
          message: `Tu as reçu ${amount} tokens${message ? `: "${message}"` : ""}`,
          data: { amount, sender_id: user.id },
        })

        return NextResponse.json(result)
      }

      // Convertir des tokens (premium -> regular)
      case "exchange": {
        const { from_type, to_type, amount } = body

        if (!from_type || !to_type || !amount) {
          return NextResponse.json(
            { error: "from_type, to_type et amount requis" },
            { status: 400 }
          )
        }

        // Récupérer les taux de conversion
        const { data: types } = await supabase
          .from("token_types")
          .select("code, exchange_rate")
          .in("code", [from_type, to_type])

        const fromType = types?.find((t) => t.code === from_type)
        const toType = types?.find((t) => t.code === to_type)

        if (!fromType || !toType) {
          return NextResponse.json({ error: "Type de token invalide" }, { status: 400 })
        }

        // Calculer le montant converti
        const convertedAmount = Math.floor(
          (amount * fromType.exchange_rate) / toType.exchange_rate
        )

        // Dépenser les tokens source
        const { data: spendResult } = await supabase.rpc("spend_tokens", {
          p_teen_id: user.id,
          p_amount: amount,
          p_token_type: from_type,
          p_reason: `Conversion ${from_type} -> ${to_type}`,
        })

        if (!spendResult?.success) {
          return NextResponse.json({
            error: spendResult?.error || "Solde insuffisant",
          }, { status: 400 })
        }

        // Ajouter les tokens destination
        const { data: earnResult } = await supabase.rpc("add_tokens_to_user", {
          p_teen_id: user.id,
          p_amount: convertedAmount,
          p_source_code: "exchange",
          p_token_type: to_type,
          p_description: `Conversion de ${amount} ${from_type}`,
          p_force_no_limit: true,
        })

        return NextResponse.json({
          success: true,
          from_amount: amount,
          from_type,
          to_amount: convertedAmount,
          to_type,
          new_balance: earnResult?.new_balance,
        })
      }

      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Tokens POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

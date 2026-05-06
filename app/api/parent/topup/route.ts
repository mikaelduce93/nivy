import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { parentId, teenId, packageId, coins, bonus, price } = body

    if (!parentId || !teenId || !packageId || !coins) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Verify parentId matches current user
    if (parentId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Verify teen is linked to parent
    const { data: link, error: linkError } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .eq("status", "active")
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { success: false, error: "Teen non lié à ce compte parent" },
        { status: 400 }
      )
    }

    // Gate: require parental e-signature on file before allowing top-ups.
    const { data: signature } = await supabase
      .from("e_signatures")
      .select("id")
      .eq("parent_id", parentId)
      .eq("terms_accepted", true)
      .limit(1)
      .maybeSingle()

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Autorisation parentale requise",
          requiresSignature: true,
        },
        { status: 403 }
      )
    }

    const totalCoins = coins + (bonus || 0)

    // Get current teen coins
    const { data: teenProfile, error: profileError } = await supabase
      .from("profiles")
      .select("total_coins")
      .eq("id", teenId)
      .single()

    if (profileError) {
      return NextResponse.json(
        { success: false, error: "Teen non trouvé" },
        { status: 404 }
      )
    }

    const currentCoins = teenProfile?.total_coins || 0
    const newTotal = currentCoins + totalCoins

    // Update teen's coins
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        total_coins: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teenId)

    if (updateError) {
      console.error("Coin update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour des coins" },
        { status: 500 }
      )
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from("coin_transactions")
      .insert({
        user_id: teenId,
        source_user_id: parentId,
        transaction_type: "topup",
        amount: totalCoins,
        description: `Recharge de ${coins} coins${bonus > 0 ? ` + ${bonus} bonus` : ""} par parent`,
        metadata: {
          package_id: packageId,
          base_coins: coins,
          bonus_coins: bonus || 0,
          price: price,
          parent_name: userInfo.fullName,
        },
        created_at: new Date().toISOString(),
      })

    if (transactionError) {
      console.error("Transaction log error:", transactionError)
    }

    // Create notification for teen
    await supabase.from("notifications").insert({
      user_id: teenId,
      type: "topup",
      title: "Coins reçus !",
      message: `${userInfo.fullName} vous a offert ${totalCoins} coins`,
      data: {
        coins: totalCoins,
        parent_id: parentId,
        parent_name: userInfo.fullName,
      },
      read: false,
      created_at: new Date().toISOString(),
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: parentId,
      action: "payment",
      description: `Recharge de ${totalCoins} coins pour teen`,
      resource_type: "topup",
      resource_id: teenId,
      metadata: {
        package_id: packageId,
        coins: totalCoins,
        price: price,
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Recharge effectuée avec succès",
      data: {
        coinsAdded: totalCoins,
        newBalance: newTotal,
      },
    })
  } catch (error) {
    console.error("Topup API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/**
 * TEENS PARTY MOROCCO - Shop Page
 * ================================
 * Page fonctionnelle de la boutique de récompenses
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ShopClient } from "./shop-client"
import { ShoppingBag, Zap, Star, Heart } from "lucide-react"

export const metadata = {
  title: "Boutique | Teens Party Morocco",
  description: "Dépense tes XP pour des récompenses exclusives !",
}

export default async function ShopPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/boutique")
  }

  // Récupérer les catégories
  const { data: categories } = await supabase
    .from("reward_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order")

  // Récupérer les récompenses disponibles via RPC
  const { data: rewards } = await supabase.rpc("get_shop_rewards", {
    p_user_id: user.id,
    p_category_slug: null,
    p_only_affordable: false,
    p_only_available: true,
  })

  // Récupérer le profil de l'utilisateur pour son XP
  const { data: userXp } = await supabase
    .from("user_xp")
    .select("total_xp, current_level")
    .eq("teen_id", user.id)
    .single()

  // Récupérer les achats de l'utilisateur
  const { data: purchases } = await supabase.rpc("get_user_purchases", {
    p_user_id: user.id,
    p_status: null,
    p_include_expired: false,
  })

  const rewardsList = rewards || []
  const purchasesList = purchases || []
  const totalXP = userXp?.total_xp || 0

  const featuredRewards = rewardsList.filter((r: any) => r.is_featured)
  const wishlistRewards = rewardsList.filter((r: any) => r.is_in_wishlist)
  const affordableRewards = rewardsList.filter((r: any) => r.xp_cost <= totalXP)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 mb-6">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-4">
              Boutique
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Dépense tes XP pour des récompenses exclusives !
            </p>
          </div>

          {/* User XP Balance */}
          <div className="max-w-md mx-auto mb-12">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center">
              <p className="text-sm text-yellow-400/80 mb-1">Ton solde</p>
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-8 h-8 text-yellow-400" />
                <span className="text-4xl font-black text-yellow-400">
                  {totalXP.toLocaleString()} XP
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Niveau {userXp?.current_level || 1}
              </p>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <ShoppingBag className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{rewardsList.length}</p>
              <p className="text-xs text-zinc-500">Disponibles</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{affordableRewards.length}</p>
              <p className="text-xs text-zinc-500">Accessibles</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{featuredRewards.length}</p>
              <p className="text-xs text-zinc-500">En vedette</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wishlistRewards.length}</p>
              <p className="text-xs text-zinc-500">Wishlist</p>
            </div>
          </div>

          {/* Main Content */}
          <ShopClient
            categories={categories || []}
            rewards={rewardsList}
            purchases={purchasesList}
            userXP={totalXP}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

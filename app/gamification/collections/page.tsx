/**
 * TEENS PARTY MOROCCO - Collections Page
 * =======================================
 * Page fonctionnelle des Collections
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CollectionsClient } from "./collections-client"
import { Layers, Trophy, Sparkles, Star } from "lucide-react"
import {
  getCollectionSets,
  getUserCollections,
  getCollectionStats,
  getNewCollectiblesCount,
  getRecentCollectibles,
} from "@/gamification-system/features/collections/actions"

export const metadata = {
  title: "Collections | Teens Party Morocco",
  description: "Collectionne des items rares et complète des sets !",
}

export default async function CollectionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/collections")
  }

  // Récupérer les sets de collection
  const sets = await getCollectionSets()

  // Récupérer les collections de l'utilisateur
  const userCollections = await getUserCollections(user.id)

  // Récupérer les statistiques
  const stats = await getCollectionStats(user.id)

  // Récupérer le nombre de nouveaux items
  const newItemsCount = await getNewCollectiblesCount(user.id)

  // Récupérer les items récents
  const recentItems = await getRecentCollectibles(user.id, 5)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6">
              <Layers className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 mb-4">
              Collections
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Collectionne des items rares et complète des sets pour gagner des récompenses !
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Layers className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.uniqueItems}</p>
              <p className="text-xs text-zinc-500">Items uniques</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.setsCompleted}/{stats.totalSets}</p>
              <p className="text-xs text-zinc-500">Sets complétés</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.completionPercentage}%</p>
              <p className="text-xs text-zinc-500">Complétion</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center relative">
              <Star className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.duplicates}</p>
              <p className="text-xs text-zinc-500">Doublons</p>
              {newItemsCount > 0 && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {newItemsCount} new
                </span>
              )}
            </div>
          </div>

          {/* Main Content */}
          <CollectionsClient
            sets={sets as unknown as Parameters<typeof CollectionsClient>[0]['sets']}
            userCollections={userCollections}
            stats={stats}
            recentItems={recentItems as unknown as Parameters<typeof CollectionsClient>[0]['recentItems']}
            userId={user.id}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

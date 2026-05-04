import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, Plus, Edit, Trash2, Star, Trophy, Calendar, Award } from 'lucide-react'
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mes Enfants | Teens Party Morocco",
  description: "Gérez les profils de vos enfants, badges fidélité et historique d'événements",
  robots: { index: false, follow: false },
}

export default async function EnfantsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/profile/enfants")
  }

  const { data: children } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", user.id)
    .order("date_naissance", { ascending: false })

  const childrenWithHistory = await Promise.all(
    (children || []).map(async (child) => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          events:event_id (title, date)
        `)
        .contains("children_ids", [child.id])
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(3)
      
      return { ...child, bookings }
    })
  )

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Mes enfants</h1>
              <p className="text-zinc-400">Gérez les profils de vos enfants</p>
            </div>
            <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white border-0">
              <Link href="/profile/enfants/ajouter">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un enfant
              </Link>
            </Button>
          </div>

          {childrenWithHistory && childrenWithHistory.length > 0 ? (
            <div className="grid gap-6">
              {childrenWithHistory.map((child) => {
                const age = Math.floor(
                  (new Date().getTime() - new Date(child.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365),
                )
                const loyaltyPoints = child.loyalty_points || 0
                const level = Math.floor(loyaltyPoints / 50) + 1
                const eventsCount = child.bookings?.length || 0

                return (
                  <Card key={child.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                          {child.photo_url ? (
                            <Image
                              src={child.photo_url || "/placeholder.svg"}
                              alt={`${child.prenom} ${child.nom}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <span className="text-white font-bold text-2xl">{child.prenom.charAt(0)}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {child.prenom} {child.nom}
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-zinc-500">Âge</p>
                              <p className="text-white">{age} ans</p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Date de naissance</p>
                              <p className="text-white">
                                {new Date(child.date_naissance).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Genre</p>
                              <p className="text-white capitalize">{child.genre || "Non spécifié"}</p>
                            </div>
                            {child.contact_urgence && (
                              <div>
                                <p className="text-zinc-500">Contact urgence</p>
                                <p className="text-white">{child.contact_urgence}</p>
                              </div>
                            )}
                            {child.allergies && (
                              <div>
                                <p className="text-zinc-500">Allergies</p>
                                <p className="text-white">{child.allergies}</p>
                              </div>
                            )}
                            {child.medical_info && (
                              <div className="md:col-span-2">
                                <p className="text-zinc-500">Informations médicales</p>
                                <p className="text-white">{child.medical_info}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                          >
                            <Link href={`/profile/enfants/${child.id}/modifier`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <Link href={`/profile/enfants/${child.id}/supprimer`}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            Badges & Fidélité
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-sm font-semibold">
                              Niveau {level}
                            </span>
                            <span className="text-cyan-400 font-bold">{loyaltyPoints} pts</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-3 mb-4">
                          {/* Newcomer badge */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full ${eventsCount >= 1 ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-zinc-800'} flex items-center justify-center mx-auto mb-1`}>
                              <Star className={`w-6 h-6 ${eventsCount >= 1 ? 'text-white' : 'text-zinc-600'}`} />
                            </div>
                            <p className="text-xs text-zinc-400">Débutant</p>
                          </div>
                          
                          {/* Regular badge */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full ${eventsCount >= 3 ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-zinc-800'} flex items-center justify-center mx-auto mb-1`}>
                              <Calendar className={`w-6 h-6 ${eventsCount >= 3 ? 'text-white' : 'text-zinc-600'}`} />
                            </div>
                            <p className="text-xs text-zinc-400">Régulier</p>
                          </div>
                          
                          {/* VIP badge */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full ${loyaltyPoints >= 100 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-zinc-800'} flex items-center justify-center mx-auto mb-1`}>
                              <Trophy className={`w-6 h-6 ${loyaltyPoints >= 100 ? 'text-white' : 'text-zinc-600'}`} />
                            </div>
                            <p className="text-xs text-zinc-400">VIP</p>
                          </div>
                          
                          {/* Elite badge */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full ${loyaltyPoints >= 200 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-zinc-800'} flex items-center justify-center mx-auto mb-1`}>
                              <Award className={`w-6 h-6 ${loyaltyPoints >= 200 ? 'text-white' : 'text-zinc-600'}`} />
                            </div>
                            <p className="text-xs text-zinc-400">Elite</p>
                          </div>
                          
                          {/* Legend badge */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full ${loyaltyPoints >= 500 ? 'bg-gradient-to-br from-pink-500 to-red-500' : 'bg-zinc-800'} flex items-center justify-center mx-auto mb-1`}>
                              <span className={`text-2xl ${loyaltyPoints >= 500 ? '' : 'grayscale opacity-30'}`}>👑</span>
                            </div>
                            <p className="text-xs text-zinc-400">Légende</p>
                          </div>
                        </div>

                        {child.bookings && child.bookings.length > 0 && (
                          <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                            <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-cyan-400" />
                              Derniers événements ({eventsCount})
                            </h5>
                            <div className="space-y-2">
                              {child.bookings.slice(0, 3).map((booking: any) => (
                                <div key={booking.id} className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-300">{booking.events?.title || 'Événement'}</span>
                                  <span className="text-zinc-500">
                                    {booking.events?.date ? new Date(booking.events.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="w-24 h-24 text-zinc-700 mb-6" />
                <CardTitle className="text-2xl text-white mb-2">Aucun enfant ajouté</CardTitle>
                <CardDescription className="mb-6">
                  Ajoutez le profil de votre premier enfant pour commencer
                </CardDescription>
                <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white border-0">
                  <Link href="/profile/enfants/ajouter">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un enfant
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

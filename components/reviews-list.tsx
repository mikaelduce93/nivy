import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

interface ReviewsListProps {
  eventId: string
}

interface ReviewRow {
  id: string
  overall_rating: number
  comment: string | null
  created_at: string | null
  teens: { pseudo: string | null; first_name: string | null } | null
}

export async function ReviewsList({ eventId }: ReviewsListProps) {
  const supabase = await createClient()

  // Table live = event_reviews ; reviewer = teens (pas de relation profiles) ;
  // .returns<>() borne le type et évite l'instanciation TS trop profonde du select embarqué
  const { data: reviews } = await supabase
    .from("event_reviews")
    .select(`
      id,
      overall_rating,
      comment,
      created_at,
      teens (
        pseudo,
        first_name
      )
    `)
    .eq("event_id", eventId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .returns<ReviewRow[]>()

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-16 h-16 text-ink mx-auto mb-4" />
        <p className="text-mute">Aucun avis pour le moment</p>
      </div>
    )
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-6 border-b border-ink">
        <div className="text-center">
          <p className="text-5xl font-black text-ink mb-2">{averageRating.toFixed(1)}</p>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating) ? "fill-gold text-gold" : "text-mute"
                }`}
              />
            ))}
          </div>
          <p className="text-mute text-sm">{reviews.length} avis</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-card rounded-xl p-6 border border-ink">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-ink font-semibold">
                  {review.teens?.pseudo || review.teens?.first_name || "Utilisateur"}
                </p>
                <p className="text-mute text-sm">
                  {review.created_at
                    ? new Date(review.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= review.overall_rating ? "fill-gold text-gold" : "text-mute"}`}
                  />
                ))}
              </div>
            </div>
            {review.comment && <p className="text-ink-2 leading-relaxed">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

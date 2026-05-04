"use client"

import type React from "react"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ReviewFormProps {
  eventId: string
  parentId: string
  onSuccess?: () => void
}

export function ReviewForm({ eventId, parentId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from("reviews").insert({
      event_id: eventId,
      parent_id: parentId,
      rating,
      comment,
      is_approved: false,
    })

    setLoading(false)

    if (!error) {
      setRating(0)
      setComment("")
      onSuccess?.()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-white font-semibold mb-3 block">Note</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white font-semibold mb-3 block">Commentaire</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience..."
          className="bg-zinc-900 border-zinc-800 text-white min-h-32"
        />
      </div>

      <Button
        type="submit"
        disabled={rating === 0 || loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
      >
        {loading ? "Envoi..." : "Soumettre mon avis"}
      </Button>

      <p className="text-zinc-500 text-sm text-center">Votre avis sera modéré avant publication</p>
    </form>
  )
}

"use client"

import { useState } from "react"
import { Heart, MessageSquare, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface PostActionsProps {
  postId: string
  initialLikes: number
  initialComments: number
  isLoggedIn: boolean
}

export default function PostActions({ postId, initialLikes, initialComments, isLoggedIn }: PostActionsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [isLiked, setIsLiked] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!isLoggedIn) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)

        setLikes(likes - 1)
        setIsLiked(false)
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        })

        setLikes(likes + 1)
        setIsLiked(true)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  return (
    <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
      <Button
        variant="ghost"
        size="sm"
        className={`text-zinc-400 hover:text-cyan-400 ${isLiked ? "text-cyan-400" : ""}`}
        onClick={handleLike}
        disabled={!isLoggedIn}
      >
        <Heart className={`w-5 h-5 mr-2 ${isLiked ? "fill-current" : ""}`} />
        {likes}
      </Button>

      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-cyan-400">
        <MessageSquare className="w-5 h-5 mr-2" />
        {initialComments}
      </Button>

      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-cyan-400">
        <Share2 className="w-5 h-5 mr-2" />
        Partager
      </Button>
    </div>
  )
}

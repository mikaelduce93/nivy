import { createClient } from "@/lib/supabase/server"
import { MessageSquare, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import PostActions from "@/components/post-actions"

export default async function CommunautePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Polish-F: wrap with try/catch and capture error so a feed failure renders
  // a banner above the empty state instead of letting the route 500 / look
  // permanently empty.
  let posts: any[] | null = null
  let loadError: string | null = null
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          full_name
        ),
        events (
          title,
          event_date
        )
      `)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) {
      console.error("[communaute] posts error:", error)
      loadError = "Impossible de charger le feed pour le moment."
    } else {
      posts = data
    }
  } catch (err) {
    console.error("[communaute] posts threw:", err)
    loadError = "Impossible de charger le feed pour le moment."
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black text-ink mb-6">Communauté</h1>
            <p className="text-xl text-teal mb-8">Partage tes meilleurs moments</p>

            {user && (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0"
              >
                <Link href="/communaute/creer">Créer un post</Link>
              </Button>
            )}
          </div>

          {loadError && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {loadError}
            </div>
          )}

          {posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gradient-to-br from-paper-2 to-card rounded-2xl overflow-hidden border border-ink"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center flex-shrink-0">
                        <span className="text-ink font-bold text-lg">
                          {post.profiles?.full_name?.charAt(0) || "U"}
                        </span>
                      </div>

                      <div className="flex-1">
                        <p className="text-ink font-semibold">{post.profiles?.full_name || "Utilisateur"}</p>
                        <p className="text-mute text-sm">
                          {new Date(post.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {post.event_id && post.events && (
                      <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-teal/10 rounded-lg border border-teal/30 w-fit">
                        <Calendar className="w-4 h-4 text-teal" />
                        <span className="text-teal text-sm font-semibold">{post.events.title}</span>
                      </div>
                    )}

                    <p className="text-ink leading-relaxed mb-4 whitespace-pre-line">{post.content}</p>

                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {(post.media_urls as string[]).slice(0, 4).map((url: string, idx: number) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden aspect-square">
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={`Media ${idx + 1}`}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <PostActions
                      postId={post.id}
                      initialLikes={post.likes_count}
                      initialComments={post.comments_count}
                      isLoggedIn={!!user}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <MessageSquare className="w-20 h-20 text-ink mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-ink mb-4">Aucun post pour le moment</h3>
              <p className="text-mute">Sois le premier à partager tes moments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

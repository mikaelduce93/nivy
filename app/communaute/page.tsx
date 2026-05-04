import { createClient } from "@/lib/supabase/server"
import { MessageSquare, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import PostActions from "@/components/post-actions"

export default async function CommunautePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: posts } = await supabase
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

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6">Communauté</h1>
            <p className="text-xl text-cyan-400 mb-8">Partage tes meilleurs moments</p>

            {user && (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
              >
                <Link href="/communaute/creer">Créer un post</Link>
              </Button>
            )}
          </div>

          {posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-zinc-800"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {post.profiles?.full_name?.charAt(0) || "U"}
                        </span>
                      </div>

                      <div className="flex-1">
                        <p className="text-white font-semibold">{post.profiles?.full_name || "Utilisateur"}</p>
                        <p className="text-zinc-500 text-sm">
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
                      <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 w-fit">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 text-sm font-semibold">{post.events.title}</span>
                      </div>
                    )}

                    <p className="text-white leading-relaxed mb-4 whitespace-pre-line">{post.content}</p>

                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {(post.media_urls as string[]).slice(0, 4).map((url: string, idx: number) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden aspect-square">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Media ${idx + 1}`}
                              className="w-full h-full object-cover"
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
              <MessageSquare className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Aucun post pour le moment</h3>
              <p className="text-zinc-400">Sois le premier à partager tes moments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

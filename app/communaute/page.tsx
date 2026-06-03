import { createClient } from "@/lib/supabase/server"
import { Calendar } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
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
    <>
      <Navbar />
      <main className="min-h-screen bg-paper">
        <div className="container mx-auto px-6 py-28">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="eyebrow tracking-[0.16em]">Communauté · Nivy</p>
              <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight md:text-6xl">
                La <em className="font-semibold italic text-pink">communauté</em>
              </h1>
              <p className="mt-3 text-xl text-ink-2">Partage tes meilleurs moments.</p>

              {user && (
                <Button asChild size="lg" variant="pink" className="mt-6">
                  <Link href="/teen/create">Créer un post</Link>
                </Button>
              )}
            </div>

            {loadError && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border-2 border-destructive bg-danger-soft px-4 py-3 text-sm font-medium text-destructive"
              >
                {loadError}
              </div>
            )}

            {posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <StickerCard key={post.id} className="overflow-hidden p-6">
                    <div className="mb-4 flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-display text-lg font-bold text-paper">
                        {post.profiles?.full_name?.charAt(0) || "U"}
                      </span>
                      <div className="flex-1">
                        <p className="font-display font-bold text-ink">
                          {post.profiles?.full_name || "Utilisateur"}
                        </p>
                        <p className="font-mono text-xs text-mute">
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
                      <div className="mb-4 flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-paper-2 px-3 py-1">
                        <Calendar className="size-4 text-teal" aria-hidden="true" />
                        <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ink">
                          {post.events.title}
                        </span>
                      </div>
                    )}

                    <p className="mb-4 whitespace-pre-line leading-relaxed text-ink">{post.content}</p>

                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-4 grid grid-cols-2 gap-2">
                        {(post.media_urls as string[]).slice(0, 4).map((url: string, idx: number) => (
                          <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border-2 border-ink">
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
                  </StickerCard>
                ))}
              </div>
            ) : (
              <NivEmpty
                mood="hype"
                title="Aucun post pour le moment"
                description="Sois le premier à partager tes moments avec le crew."
                action={
                  user ? (
                    <Button asChild variant="pink">
                      <Link href="/teen/create">Créer un post</Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

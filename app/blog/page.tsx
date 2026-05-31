import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Calendar, User, ArrowRight } from "lucide-react"
import Link from "next/link"

import { OptimizedImage } from "@/components/optimized-image"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty, Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

export default async function BlogPage() {
  const supabase = await createClient()

  let posts = null
  let categories = null

  try {
    const { data: postsData } = await supabase
      .from("blog_posts")
      .select(`
        *,
        post_categories (
          name,
          slug
        ),
        profiles (
          full_name
        )
      `)
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(12)
    posts = postsData
  } catch (error) {
    console.log("[v0] Blog posts table not found, showing empty state")
    posts = []
  }

  try {
    const { data: categoriesData } = await supabase
      .from("post_categories")
      .select("*")
    categories = categoriesData
  } catch (error) {
    console.log("[v0] Post categories table not found")
    categories = []
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="relative overflow-hidden">
        <MeshBackground />
        <div className="relative container mx-auto px-6 py-28">
          <div className="flex flex-col items-center gap-5 text-center">
            <Niv mood="calm" size={110} float />
            <p className="eyebrow tracking-[0.16em]">Blog Nivy</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-balance md:text-6xl">
              Actualités &amp; <em className="font-semibold italic text-pink">conseils</em>
            </h1>
            <p className="max-w-2xl text-xl text-ink-2 text-balance">
              Nos derniers articles, conseils et actus de la communauté.
            </p>
          </div>

          {categories && categories.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/blog">Tous</Link>
              </Button>
              {categories.map((cat) => (
                <Button key={cat.id} variant="outline" asChild>
                  <Link href={`/blog?categorie=${cat.slug}`}>{cat.name}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {posts && posts.length > 0 ? (
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <div key={post.id} className="group block">
                <StickerCard variant="hover" className="h-full gap-0 overflow-hidden p-0">
                  {post.cover_image && (
                    <div className="relative aspect-video border-b-2 border-ink">
                      <OptimizedImage
                        src={post.cover_image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    {post.post_categories && (
                      <span className="mb-3 inline-block rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                        {post.post_categories.name}
                      </span>
                    )}

                    <h3 className="mb-3 line-clamp-2 font-display text-xl font-bold transition-colors group-hover:text-pink">
                      {post.title}
                    </h3>

                    <p className="mb-4 line-clamp-3 text-sm text-mute">{post.excerpt}</p>

                    <div className="flex items-center justify-between font-mono text-xs text-mute">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" aria-hidden="true" />
                          {new Date(post.published_at).toLocaleDateString("fr-FR")}
                        </span>
                        {post.profiles && (
                          <span className="flex items-center gap-1">
                            <User className="size-3" aria-hidden="true" />
                            {post.profiles.full_name}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="size-4 text-ink transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </div>
                </StickerCard>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <NivEmpty
              mood="calm"
              title="Aucun article pour le moment"
              description="Nos premiers articles arrivent bientôt — reviens vite !"
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

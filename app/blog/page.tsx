import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Calendar, User, ArrowRight, BookOpen } from 'lucide-react'
import { OptimizedImage } from "@/components/optimized-image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-background to-blue-500/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative container mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-semibold mb-6">
              <BookOpen className="w-4 h-4" />
              Blog Teens Party
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 text-balance">
              Actualités & <span className="text-gradient">Conseils</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Découvre nos derniers articles, conseils et actualités de la communauté
            </p>
          </div>

          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/blog">Tous</Link>
              </Button>
              {categories.map((cat) => (
                <Button key={cat.id} variant="outline" asChild>
                  <Link href={`/blog/categorie/${cat.slug}`}>{cat.name}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        {posts && posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition duration-500" />
                  <div className="relative bg-card rounded-3xl overflow-hidden border border-border">
                    {post.cover_image && (
                      <div className="relative aspect-video">
                        <OptimizedImage
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      {post.post_categories && (
                        <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-3">
                          {post.post_categories.name}
                        </span>
                      )}

                      <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {post.title}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(post.published_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          {post.profiles && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{post.profiles.full_name}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Aucun article pour le moment</p>
            <p className="text-sm text-muted-foreground">Nos premiers articles arrivent bientôt!</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

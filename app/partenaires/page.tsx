import { createClient } from "@/lib/supabase/server"
import { Sparkles, Store, Tag, ExternalLink, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function PartenairesPage() {
  const supabase = await createClient()

  const { data: partners } = await supabase.from("partners").select("*").eq("is_active", true).order("name")

  const categories = Array.from(new Set(partners?.map((p) => p.category).filter(Boolean)))

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6">Nos Partenaires</h1>
          <p className="text-xl text-cyan-400 mb-4">Des avantages exclusifs pour la communauté Teens Party</p>
          <p className="text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Profite de réductions et avantages chez nos partenaires. Plus tu participes à nos événements, plus tu
            débloques d'avantages!
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90">
            <Link href="/devenir-partenaire">
              Devenir partenaire
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>

        {partners && partners.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {partners.map((partner) => (
              <div key={partner.id} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition duration-1000" />
                <div className="relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
                  <div className="relative h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url || "/placeholder.svg"}
                        alt={partner.name}
                        className="w-full h-full object-contain p-8"
                      />
                    ) : (
                      <Store className="w-20 h-20 text-zinc-700" />
                    )}
                    {partner.category && (
                      <div className="absolute top-4 left-4">
                        <div className="bg-cyan-500/90 backdrop-blur text-white font-bold text-xs px-3 py-1 rounded-full">
                          {partner.category}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-3">{partner.name}</h3>

                    {partner.description && (
                      <p className="text-zinc-400 text-sm mb-4 line-clamp-3">{partner.description}</p>
                    )}

                    {partner.discount_offered && (
                      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-4 mb-4 border border-cyan-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-5 h-5 text-cyan-400" />
                          <p className="text-cyan-400 font-semibold text-sm">Avantage membre</p>
                        </div>
                        <p className="text-white font-bold">{partner.discount_offered}</p>
                      </div>
                    )}

                    {partner.website_url && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white bg-transparent"
                      >
                        <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                          Visiter le site
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Sparkles className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">Bientôt des partenaires</h3>
            <p className="text-zinc-400">
              Nous travaillons à créer un réseau de partenaires pour vous offrir encore plus d'avantages
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

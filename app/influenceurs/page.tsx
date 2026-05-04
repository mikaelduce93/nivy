import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrendingUp, Target, Users, DollarSign, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function InfluenceursPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from("influencer_campaigns")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-background to-coral-500/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-coral-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative container mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Programme Influenceurs
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 text-balance">
              Deviens <span className="text-gradient">Influenceur</span> Teens Party
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Crée du contenu, inspire ta communauté et gagne des revenus avec nos campagnes exclusives
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 max-w-6xl mx-auto">
            {[
              { icon: TrendingUp, title: "Campagnes rémunérées", desc: "500-5000 DH par campagne" },
              { icon: Target, title: "Objectifs clairs", desc: "KPIs définis et mesurables" },
              { icon: Users, title: "Communauté engagée", desc: "Audience ados 13-19 ans" },
              { icon: DollarSign, title: "Paiements rapides", desc: "Virements sous 7 jours" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative bg-card hover:bg-accent/50 rounded-2xl p-6 border border-border transition-all duration-300 hover:scale-105"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-coral-500 flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4">Campagnes Actives</h2>
          <p className="text-muted-foreground">Choisis la campagne qui correspond à ton style</p>
        </div>

        {campaigns && campaigns.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-coral-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition duration-500" />
                <div className="relative bg-card rounded-3xl p-6 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                      {campaign.budget} DH
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Jusqu'au {new Date(campaign.end_date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-3">{campaign.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{campaign.description}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <span className="text-muted-foreground">Objectif: {campaign.target_conversions} conversions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-coral-400" />
                      <span className="text-muted-foreground">Commission: {campaign.commission_rate}%</span>
                    </div>
                  </div>

                  <Button className="w-full" asChild>
                    <Link href={`/influenceurs/${campaign.id}`}>
                      Voir les détails
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-6">Aucune campagne active pour le moment</p>
            <p className="text-sm text-muted-foreground">Reviens bientôt pour découvrir nos prochaines campagnes!</p>
          </div>
        )}

        <div className="mt-20 max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-coral-500 to-purple-500 rounded-3xl blur-xl opacity-75" />
            <div className="relative bg-card rounded-3xl p-8 md:p-12 border border-border text-center">
              <h2 className="text-3xl font-black mb-4">Prêt à devenir influenceur?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Rejoins notre programme d'influenceurs et commence à gagner de l'argent en créant du contenu que tu
                aimes
              </p>
              <Button size="lg" asChild>
                <Link href="/influenceurs/candidature">
                  Postuler maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

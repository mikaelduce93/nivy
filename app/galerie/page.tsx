import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

import { NivEmpty, Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

// La table `photo_galleries` (et ses colonnes cover_photo/photo_count) n'existe
// dans aucun schéma live : la requête échouait toujours et la page ne rendait
// que l'état vide. On retire la lecture morte et on conserve cet état vide.
export default async function GaleriePage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="relative overflow-hidden">
        <MeshBackground />
        <div className="relative container mx-auto px-6 py-28">
          <div className="flex flex-col items-center gap-5 text-center">
            <Niv mood="hype" size={110} float />
            <p className="eyebrow tracking-[0.16em]">Galerie · Nivy</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-balance md:text-6xl">
              Nos meilleurs <em className="font-semibold italic text-pink">moments</em>
            </h1>
            <p className="max-w-2xl text-xl text-ink-2 text-balance">
              Revis l'ambiance de nos events en images.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-md">
          <NivEmpty
            mood="hype"
            title="Aucune galerie pour le moment"
            description="Les photos de nos prochains events arrivent bientôt en ligne !"
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

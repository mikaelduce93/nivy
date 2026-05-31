"use client"

import { useState } from "react"
import { Award, Music } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SegmentedSwitcher } from "@/components/brand/sticker-tab"

interface DjTabsProps {
  bio: string
  specialties?: string[] | null
  musicStyles?: string[] | null
  videoUrls?: string[] | null
}

/**
 * Onglets du profil DJ (#116). Barre pilotée par la primitive F6
 * `<SegmentedSwitcher>` ; le contenu (À propos / Vidéos / Avis) reste géré
 * localement par switch d'état — iso-comportement de l'ancien `Tabs` shadcn.
 */
export function DjTabs({ bio, specialties, musicStyles, videoUrls }: DjTabsProps) {
  const [tab, setTab] = useState("about")

  return (
    <div>
      <SegmentedSwitcher
        ariaLabel="Sections du profil DJ"
        value={tab}
        onValueChange={setTab}
        className="w-full"
        tabs={[
          { value: "about", label: "À propos" },
          { value: "videos", label: "Vidéos" },
          { value: "reviews", label: "Avis" },
        ]}
      />

      {tab === "about" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biographie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spécialités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {specialties?.map((specialty: string) => (
                  <div key={specialty} className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-lime" />
                    <span>{specialty}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Styles Musicaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {musicStyles?.map((style: string) => (
                  <Badge key={style} variant="secondary" className="text-base px-4 py-2">
                    <Music className="mr-2 h-4 w-4" />
                    {style}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "videos" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {videoUrls?.map((url: string, index: number) => (
                  <div
                    key={index}
                    className="aspect-video bg-muted rounded-lg flex items-center justify-center"
                  >
                    <p className="text-muted-foreground">Vidéo {index + 1}</p>
                  </div>
                ))}
                {(!videoUrls || videoUrls.length === 0) && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    Aucune vidéo disponible pour le moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                Les avis seront bientôt disponibles
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

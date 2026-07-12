/**
 * G4-B2 — écran de dégradation « Les battles arrivent bientôt ».
 *
 * Rendu quand le socle DB battles (mig 181/182, agent parallèle) n'est pas
 * encore appliqué : table `battles` absente au SELECT serveur, ou RPC
 * absente au moment d'une action client. L'app ne casse JAMAIS (pattern
 * tryAdaptiveQuizRecommendations, spec G4 §2.3).
 *
 * Composant présentationnel pur — importable côté serveur ET client.
 */
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

export function BattlesComingSoon() {
  return (
    <div className="mx-auto max-w-lg pt-12 pb-32">
      <NivEmpty
        mood="calm"
        title="Les battles arrivent bientôt"
        description="Le mode 1v1 en temps réel est en cours de branchement. En attendant, tu peux lancer un défi asynchrone à un ami."
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Button variant="pink" asChild>
              <Link href="/teen/quests/friend-defis">Défis amis</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/teen/quests">Retour aux quêtes</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}

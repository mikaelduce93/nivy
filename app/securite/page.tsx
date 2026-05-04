import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrustBanner } from "@/components/trust-banner"
import { Shield, Users, Camera, Phone, FileCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "Sécurité | Teens Party Morocco",
  description: "Notre engagement sécurité : encadrement professionnel, sans alcool, contrôles stricts pour des événements ados en toute sérénité"
}

export default function SecuritePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <TrustBanner />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Votre tranquillité, notre priorité</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              La Sécurité Avant Tout
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl mx-auto">
            Des événements pour ados conçus avec les plus hauts standards de sécurité. 
            Encadrement professionnel, contrôles stricts, environnement surveillé.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Security Measures */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6 bg-zinc-900/50 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">100% Sans Alcool</h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Contrôles à l'entrée et fouilles si nécessaire</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Surveillance continue pendant l'événement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Boissons servies uniquement par notre staff</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Zéro tolérance - Expulsion immédiate si infraction</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-zinc-900/50 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Encadrement Professionnel</h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Ratio 1 adulte pour 10 adolescents maximum</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Staff formé aux premiers secours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Équipe de sécurité professionnelle sur place</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Supervision continue de A à Z</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-zinc-900/50 border-blue-500/20 hover:border-blue-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Check-in/Check-out Sécurisé</h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Scan QR code à l'arrivée et au départ</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Notifications temps réel aux parents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Photo de confirmation à l'entrée</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Aucune sortie non autorisée</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-zinc-900/50 border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Communication Parents</h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Ligne directe disponible H24 pendant l'événement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Updates réguliers par SMS/WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Réponse immédiate en cas d'urgence</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Rapport post-événement disponible</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Additional Measures */}
          <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 rounded-2xl border border-zinc-800 p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <FileCheck className="w-6 h-6 text-cyan-400" />
              Autres Mesures de Sécurité
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  Contrôles d'Accès
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Vérification d'âge à l'entrée (CIN/Carte d'identité)</li>
                  <li>• Liste de participants pré-validée</li>
                  <li>• Bracelets d'identification obligatoires</li>
                  <li>• Sortie uniquement avec autorisation parentale</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400" />
                  Règles de Conduite
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Respect obligatoire entre participants</li>
                  <li>• Interdiction de fumer (y compris vape)</li>
                  <li>• Tenue vestimentaire appropriée requise</li>
                  <li>• Téléphones autorisés mais usage modéré</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Sécurité Physique
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Lieux vérifiés et aux normes de sécurité</li>
                  <li>• Issues de secours clairement indiquées</li>
                  <li>• Extincteurs et matériel de premiers secours</li>
                  <li>• Éclairage optimal dans toutes les zones</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Protection des Mineurs
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Autorisation parentale obligatoire</li>
                  <li>• Aucun contact avec des adultes externes</li>
                  <li>• Protection des données personnelles (CNDP)</li>
                  <li>• Droit à l'image respecté (opt-out disponible)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Emergency Protocol */}
          <Card className="p-8 bg-gradient-to-br from-red-950/30 to-orange-950/30 border-red-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Protocole d'Urgence</h2>
                <p className="text-zinc-300 mb-4">
                  En cas d'incident ou d'urgence médicale, notre équipe suit un protocole strict :
                </p>
                <ol className="space-y-2 text-zinc-300 list-decimal list-inside">
                  <li>Contact immédiat des parents et services d'urgence si nécessaire</li>
                  <li>Premiers secours prodigués par notre staff formé</li>
                  <li>Évacuation ordonnée si situation l'exige</li>
                  <li>Rapport détaillé fourni aux parents</li>
                </ol>
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-red-400 mb-2">Numéro d'Urgence Événement</p>
                  <p className="text-2xl font-bold text-white">+212 661 234 567</p>
                  <p className="text-sm text-zinc-400 mt-1">Disponible uniquement pendant les événements</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

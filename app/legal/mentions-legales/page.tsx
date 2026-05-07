import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getPublicAppConfig } from "@/lib/config/app-config"

export default function MentionsLegalesPage() {
  const { contactEmail, privacyEmail } = getPublicAppConfig()
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Mentions Légales</h1>

          <div className="space-y-8 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Éditeur du Site</h2>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p>
                  <strong>Raison sociale :</strong> Nivy SARL
                </p>
                <p>
                  <strong>Forme juridique :</strong> Société à Responsabilité Limitée
                </p>
                <p>
                  <strong>Capital social :</strong> [Montant] MAD
                </p>
                <p>
                  <strong>RC :</strong> [Numéro RC]
                </p>
                <p>
                  <strong>ICE :</strong> [Numéro ICE]
                </p>
                <p>
                  <strong>Siège social :</strong> [Adresse complète]
                </p>
                <p>
                  <strong>Téléphone :</strong> +212 5XX-XXXXXX
                </p>
                <p>
                  <strong>Email :</strong> {contactEmail}
                </p>
                <p>
                  <strong>Directeur de publication :</strong> [Nom du responsable légal]
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Hébergement</h2>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p>
                  <strong>Hébergeur :</strong> Vercel Inc.
                </p>
                <p>
                  <strong>Adresse :</strong> 440 N Barranca Ave #4133, Covina, CA 91723, USA
                </p>
                <p>
                  <strong>Site web :</strong>{" "}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    vercel.com
                  </a>
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg space-y-2 mt-4">
                <p>
                  <strong>Base de données :</strong> Supabase Inc.
                </p>
                <p>
                  <strong>Adresse :</strong> 970 Toa Payoh North, #07-04, Singapore 318992
                </p>
                <p>
                  <strong>Site web :</strong>{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    supabase.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Propriété Intellectuelle</h2>
              <p className="leading-relaxed mb-3">
                L'ensemble des éléments composant le site (structure, textes, images, logos, vidéos, sons, etc.) est la
                propriété exclusive de Nivy ou fait l'objet d'une autorisation d'utilisation.
              </p>
              <p className="leading-relaxed">
                Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale ou
                partielle du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit
                est interdite sans l'autorisation écrite préalable de Nivy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Protection des Données Personnelles</h2>
              <p className="leading-relaxed mb-3">
                Conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des
                données à caractère personnel et au RGPD européen (pour nos utilisateurs européens), vous disposez d'un
                droit d'accès, de rectification, de suppression et d'opposition aux données vous concernant.
              </p>
              <p className="leading-relaxed mb-3">
                <strong>Responsable du traitement :</strong> Nivy SARL
              </p>
              <p className="leading-relaxed mb-3">
                <strong>Délégué à la Protection des Données (DPO) :</strong> [Nom et contact du DPO si applicable]
              </p>
              <p className="leading-relaxed">
                Pour exercer ces droits :{" "}
                <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">
                  {privacyEmail}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
              <p className="leading-relaxed mb-3">
                Le site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de
                visite. L'utilisateur peut s'opposer à l'enregistrement de cookies en configurant son navigateur.
              </p>
              <p className="leading-relaxed">Pour plus d'informations, consultez notre page dédiée aux cookies.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Limitation de Responsabilité</h2>
              <p className="leading-relaxed mb-3">
                Nivy met tout en œuvre pour offrir aux utilisateurs des informations et outils
                disponibles et vérifiés, mais ne saurait être tenu responsable des erreurs, d'une absence de
                disponibilité des informations et/ou de la présence de virus sur son site.
              </p>
              <p className="leading-relaxed">
                Les événements sont organisés avec le plus grand soin et dans le respect des normes de sécurité. Une
                assurance responsabilité civile professionnelle couvre nos activités.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Liens Hypertextes</h2>
              <p className="leading-relaxed mb-3">
                Le site peut contenir des liens vers d'autres sites. Nivy n'exerce aucun contrôle sur ces
                sites et décline toute responsabilité quant à leur contenu.
              </p>
              <p className="leading-relaxed">
                La création de liens hypertextes vers le site nécessite l'autorisation préalable de Nivy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Droit Applicable</h2>
              <p className="leading-relaxed">
                Les présentes mentions légales sont régies par le droit marocain. Tout litige relatif à l'utilisation du
                site est soumis à la compétence exclusive des tribunaux de Casablanca, Maroc.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Crédits</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Conception et développement :</strong> [Nom de l'agence ou développeur]
                </li>
                <li>
                  <strong>Design graphique :</strong> [Nom du designer]
                </li>
                <li>
                  <strong>Photographies :</strong> [Crédits photos si applicable]
                </li>
                <li>
                  <strong>Icônes :</strong> Lucide Icons
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p>
                  <strong>Service Client</strong>
                </p>
                <p>
                  Email :{" "}
                  <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                    {contactEmail}
                  </a>
                </p>
                <p>Téléphone : +212 5XX-XXXXXX</p>
                <p>Horaires : Lundi - Vendredi, 9h - 18h</p>
                <p>Adresse : [Adresse complète du siège social]</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

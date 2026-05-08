# Formulaire de déclaration / demande d'autorisation préalable — CNDP

> **Document préparé par :** équipe technique Nivy
> **Date de préparation :** 2026-05-08
> **Statut :** projet à valider par le conseil juridique avant dépôt
> **Régime applicable :** **AUTORISATION PRÉALABLE** (et non simple déclaration), en raison du traitement de données concernant des mineurs et de l'usage de la géolocalisation. Référence : Loi 09-08 art. 12 et art. 21 — à confirmer auprès du conseil.
> **Plateforme de dépôt :** portail CNDP (https://www.cndp.ma — section télédéclaration ou dépôt papier au siège, à confirmer).

---

## A — Identification du responsable du traitement

| Rubrique | Valeur |
|---|---|
| Dénomination sociale | <<TO_FILL — raison sociale exacte selon statuts (probablement « Nivy SARL » ou autre forme juridique retenue)>> |
| Forme juridique | <<TO_FILL — SARL / SARL AU / SA / autre>> |
| Capital social | <<TO_FILL — en DH, conforme à l'extrait modèle J récent>> |
| Numéro RC (Registre du Commerce) | <<TO_FILL — RC Casablanca n°...>> |
| Identifiant ICE | <<TO_FILL — 15 chiffres>> |
| Numéro patente | <<TO_FILL>> |
| Identifiant Fiscal (IF) | <<TO_FILL>> |
| Numéro CNSS | <<TO_FILL — si employeur>> |
| Siège social | <<TO_FILL — adresse complète, ville, code postal>> |
| Téléphone | <<TO_FILL — fixe ou mobile professionnel, format +212 ...>> |
| E-mail de contact | <<TO_FILL — e-mail générique du responsable, type contact@nivy.ma>> |
| Site web | https://nivy.ma |
| Représentant légal (gérant) | <<TO_FILL — Nom, prénom, qualité (gérant unique / cogérant), CIN>> |
| Activité principale | Édition d'une plateforme numérique de gamification et de services lifestyle pour adolescents, intégrant gestion d'e-monnaie pré-payée, place de marché, transport, restauration et mentorat |

---

## B — Désignation du Délégué à la Protection des Données (DPO)

| Rubrique | Valeur |
|---|---|
| DPO désigné ? | <<TO_FILL — OUI / NON>> |
| Nom et prénom du DPO | <<TO_FILL>> |
| Qualité (interne / externe) | <<TO_FILL>> |
| Adresse postale | <<TO_FILL>> |
| Téléphone direct | <<TO_FILL>> |
| E-mail | privacy@nivy.ma (à pointer vers la boîte du DPO) |
| Formation / certification | <<TO_FILL — recommandé : DPO certifié par CNDP ou équivalent (CIPP/E, CDPSE)>> |

> **🔴 RECOMMANDATION FORTE.** La désignation d'un DPO n'est pas formellement obligatoire pour toutes les structures, mais elle est **vivement recommandée** dans le cas de Nivy compte tenu :
> - du traitement systématique de données de mineurs ;
> - de la géolocalisation ;
> - du profilage comportemental ;
> - de l'engagement public d'un canal `privacy@nivy.ma` dans la politique de confidentialité publiée.
>
> En l'absence de DPO interne disponible, une option DPO externalisé (cabinet conseil ou avocat) doit être privilégiée. **Si pas encore désigné au moment du dépôt CNDP, prévoir cette désignation comme engagement pris dans le dossier.**

---

## C — Description résumée du traitement

**Nivy** est une plateforme web (PWA) destinée aux adolescents de 13 à 17 ans résidant au Maroc et à leurs parents. Elle propose :

1. Un système de gamification (XP gagnés par des défis, quizz, missions) ;
2. Une e-monnaie pré-payée (« coins ») chargée par les parents en DH via prestataire BAM-agréé (Cash Plus, Wafacash, M2T) et dépensable chez les partenaires Nivy ;
3. Des services lifestyle gérés en propre ou via partenaires : transport (rides), restauration (food orders), place de marché C2C entre adolescents (avec lieux de rencontre sécurisés école / partenaire), mentorat, allowance / chores parentales ;
4. Un système d'autorisation parentale per-action : chaque transaction au-delà du plafond, chaque trajet, chaque session de mentorat fait l'objet d'une approbation explicite du parent.

L'ensemble est hébergé sur infrastructure cloud européenne (Supabase Frankfurt, Vercel UE) avec un sous-traitant marocain pour l'e-monnaie.

**Nombre estimatif de personnes concernées à 12 mois.** <<TO_FILL — projection adolescents + parents + partenaires + chauffeurs + mentors>>

**Date prévue de mise en service.** <<TO_FILL — date du lancement public V1>>

---

## D — Finalités du traitement (résumé renvoyant au registre détaillé)

Le présent dossier couvre **13 traitements** détaillés dans le document `01-registre-des-traitements.md` joint en annexe. Les finalités sont :

| # | Finalité | Catégorie de personnes |
|---|---|---|
| T-01 | Inscription adolescent + autorisation parentale | Mineurs + parents |
| T-02 | Authentification et sessions | Tous |
| T-03 | Profil adolescent | Mineurs |
| T-04 | Profil parent | Parents |
| T-05 | Comptabilité paiements et e-monnaie | Parents + ados |
| T-06 | Notifications transactionnelles | Tous |
| T-07 | Géolocalisation transport | Mineurs + chauffeurs |
| T-08 | Photos / vidéos téléversées | Mineurs |
| T-09 | KYC partenaires | Adultes professionnels |
| T-10 | Enregistrements sessions mentorat | (en attente — voir doc 03) |
| T-11 | Modération de contenu | Tous |
| T-12 | Analytique comportementale | Tous (mineurs majoritaires) |
| T-13 | Conservation légale | Tous |

---

## E — Catégories de données traitées (synthèse)

- **Identifiantes :** nom, prénom, e-mail, téléphone, CIN du parent.
- **De connexion :** identifiants de session, adresses IP, user-agent, journaux d'accès.
- **De profil :** date de naissance (mineur), ville, école, niveau scolaire, intérêts déclarés, préférences de notification.
- **Financières :** historiques de top-up et de dépense, références prestataire de paiement (jamais le numéro de carte en clair).
- **De géolocalisation :** adresses pickup / dropoff des trajets, traces GPS temps réel pendant le trajet.
- **D'image :** selfies / photos / vidéos de défis et de chores, photos de pièce d'identité parent.
- **Comportementales :** signaux d'engagement, scores d'affinité, historique de consommation interne plateforme.
- **Sensibles au sens de l'art. 4 :** AUCUNE (pas de données de santé, d'origine, de religion, de vie sexuelle, de convictions politiques).

---

## F — Catégories de personnes concernées

1. **Adolescents 13-17 ans résidant au Maroc** — utilisateurs principaux.
2. **Parents et représentants légaux** — adultes majeurs.
3. **Partenaires commerciaux** — commerçants, restaurants, lieux d'événement, écoles partenaires (personnes morales représentées par un staff identifié).
4. **Chauffeurs partenaires** — adultes majeurs ayant satisfait au KYC.
5. **Mentors** — adultes majeurs professionnels diplômés.
6. **Ambassadeurs** — utilisateurs (adultes ou ados parrainés) participant au programme de référencement.

---

## G — Destinataires des données

### G.1 Internes
- Équipe technique Nivy (admins applicatifs avec accès journalisé).
- Équipe support de niveau 1 et 2.
- Équipe modération (rôle `moderator`).
- Équipe KYC (rôle `kyc_reviewer`).
- DPO (accès en lecture systématique pour audit).

### G.2 Sous-traitants (liste exhaustive — Loi 09-08 art. 25 — à confirmer)

| Sous-traitant | Service rendu | Pays | Données transmises |
|---|---|---|---|
| Supabase Inc. | Base de données + Storage + Auth | Allemagne (Frankfurt — UE) | Toutes données de la plateforme |
| Vercel Inc. | Hébergement applicatif Next.js | UE (Frankfurt) | Logs HTTP, requêtes |
| Sentry | Suivi d'erreurs applicatives | UE | Stack traces (pas de PII en clair) |
| Resend | Envoi e-mails transactionnels | États-Unis | Adresse e-mail destinataire + contenu |
| Upstash | Rate limiting + cache | UE | Hash d'identifiants techniques |
| Cash Plus | E-monnaie BAM-agréée | Maroc | Identité parent + montants top-up |
| Wafacash | E-monnaie BAM-agréée | Maroc | Identité parent + montants top-up |
| M2T | E-monnaie BAM-agréée | Maroc | Identité parent + montants top-up |
| Stripe (si activé) | Paiement carte bancaire international | Irlande / États-Unis | Tokens carte + montants |
| CMI | Paiement carte bancaire local | Maroc | Tokens carte + montants |

Tous les sous-traitants sont liés par un contrat de sous-traitance conforme à la Loi 09-08 (art. 25 — à confirmer) imposant : la confidentialité, la limitation à la finalité, l'interdiction de réutilisation, la sous-traitance ultérieure soumise à autorisation, la suppression à fin de contrat, l'assistance en cas d'incident.

### G.3 Destinataires externes ponctuels
- Autorité judiciaire ou administrative sur réquisition légale.
- Bank Al-Maghrib pour audits e-monnaie.
- Direction Générale des Impôts pour contrôles fiscaux.
- Unité de protection de l'enfance en cas de signalement.

---

## H — Transferts de données hors du Maroc

**Liste consolidée :**

- **UE (pays présentant un niveau de protection adéquat selon la doctrine CNDP — à confirmer) :**
  - Supabase (Frankfurt, Allemagne) : hébergement DB + Storage + Auth.
  - Vercel (UE) : hébergement applicatif.
  - Sentry (UE) : suivi d'erreurs.
  - Upstash (UE) : rate limiting.
- **États-Unis (mécanisme à valider) :**
  - Resend : envoi e-mail transactionnel — clauses contractuelles types (CCT) ou Data Privacy Framework, à confirmer avec le sous-traitant.
- **Irlande / États-Unis (Stripe) :** clauses contractuelles types.

**Mécanismes invoqués (à valider par le conseil) :**

1. Pour les sous-traitants UE : l'UE est généralement reconnue par la CNDP comme zone offrant une protection équivalente, ce qui permet le transfert sans formalité supplémentaire **sous réserve de confirmation du conseil**.
2. Pour les sous-traitants US : recours aux clauses contractuelles types et adhésion au Data Privacy Framework si applicable. Demande d'autorisation spécifique CNDP au titre de l'art. 43 (Loi 09-08 — à confirmer) pour le transfert hors zone adéquate.

**Engagement.** Aucune donnée n'est hébergée dans un pays tiers ne présentant pas de garanties suffisantes au sens de la Loi 09-08.

---

## I — Mesures de sécurité techniques et organisationnelles

### I.1 Mesures techniques

- **Chiffrement en transit :** TLS 1.3 obligatoire (HSTS strict) pour tous les flux applicatifs, API et téléversements.
- **Chiffrement au repos :** AES-256 sur Supabase Storage (CIN, KYC, défi-proofs, chore-evidence, mentor-recordings, user-exports). AES-256 sur Supabase Postgres (managed).
- **Authentification :** Supabase Auth avec hachage bcrypt côté serveur, jetons de session HTTPOnly + Secure + SameSite=Lax, 2FA disponible (TOTP).
- **Contrôle d'accès :** RLS (Row Level Security) Postgres systématique sur toutes les tables PII, avec politiques scopées par `auth.uid()`. Rôles applicatifs minimaux (RBAC).
- **Cloisonnement service-role :** la clé service-role n'est jamais exposée côté client. Vérification automatique par grep CI/CD.
- **CSRF :** double-submit token pattern sur toutes les routes non-GET.
- **Rate limiting :** Upstash Redis distribué, presets par catégorie d'endpoint (auth / payment / upload / api).
- **CSP :** Content Security Policy avec nonce par requête.
- **Headers de sécurité :** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Audit logs :** `admin_audit_logs` pour toutes les actions sensibles administrateur.
- **Backups :** quotidiens automatiques (Supabase managed), chiffrés, rétention 30 jours.
- **Buckets sensibles :** tous configurés `public = false`, accès via URL signées de courte durée (≤ 5 min).
- **Anti-DDoS :** protection Vercel Edge (Shield) au niveau réseau.

### I.2 Mesures organisationnelles

- **Politique de sécurité :** documentée dans `docs/vision/audit-prelaunch/07-security-compliance.md` et tenue à jour.
- **Audit pré-lancement :** réalisé en mai 2026 sur l'intégralité de la stack, livré sous forme de 22 audits sectoriels.
- **Procédure d'incident :** plan de réponse documenté (à formaliser — recommandation conseil).
- **Notification d'incident :** la CNDP est informée dans les 72 heures de la prise de connaissance d'une violation susceptible d'engendrer un risque pour les droits et libertés des personnes concernées (art. à confirmer).
- **Sensibilisation interne :** formation des nouveaux collaborateurs à la Loi 09-08 et aux procédures Nivy.
- **Confidentialité des collaborateurs :** clause de confidentialité dans tous les contrats de travail et de prestation.
- **Gestion des accès :** principe du moindre privilège, revues trimestrielles, révocation immédiate lors d'un départ.
- **Hébergement souverain ou européen :** privilégié systématiquement. Aucun transfert vers des pays tiers sans garanties.
- **Politique de confidentialité publique :** publiée à l'adresse https://nivy.ma/legal/confidentialite, accessible sans authentification.
- **Droits des personnes :** mécanismes d'exercice intégrés au produit (`/parametres/donnees`) — export JSON et demande de suppression avec délai de grâce de 30 jours, conformes à la Loi 09-08.

---

## J — Durées de conservation (synthèse)

Voir registre détaillé `01-registre-des-traitements.md` pour le détail traitement par traitement.

| Catégorie | Durée |
|---|---|
| Données de compte actif | Indéfinie tant que le compte est actif |
| Compte inactif (24 mois sans connexion) | Suppression automatique après préavis |
| Données comptables (DH) | 10 ans |
| Documents KYC partenaires | 5 ans après fin de relation |
| E-signatures parentales | 5 ans après clôture |
| Géolocalisation GPS détaillée (`ride_tracks`) | 30 jours |
| Adresses de trajet (`ride_bookings`) | 24 mois puis pseudonymisation |
| Logs de connexion | 30 jours |
| Notifications individuelles | 12 mois |
| Signalements modération | 36 mois |
| Backups | 30 jours |
| Photos / vidéos de défis | 12 mois ou jusqu'à demande de suppression |
| Enregistrements de sessions mentorat | 90 jours (en attente de décision finale — voir T-10) |

---

## K — Section spéciale : DONNÉES CONCERNANT DES MINEURS

> **Référence : Loi 09-08 art. 11 — à confirmer.**

### K.1 Public principal

La majorité des personnes concernées par les traitements Nivy est constituée de **mineurs âgés de 13 à 17 ans**. Cette caractéristique impose un régime renforcé.

### K.2 Mécanisme de consentement parental

- Toute inscription adolescent est subordonnée à la fourniture d'une **e-signature** par le parent ou représentant légal, assortie du **téléversement de la pièce d'identité (CIN)** du parent.
- Cette signature est horodatée, capture l'adresse IP, le user-agent, et les versions des CGU et de la politique de confidentialité acceptées.
- La signature est conservée 5 ans à des fins probatoires.
- Le parent peut révoquer son consentement à tout moment, ce qui entraîne le verrouillage immédiat puis la suppression du compte adolescent dans le délai de grâce de 30 jours.

### K.3 Information adaptée à l'âge

- La politique de confidentialité (https://nivy.ma/legal/confidentialite) est rédigée dans une langue accessible (tutoiement, exemples concrets) tout en étant juridiquement complète.
- À l'inscription, l'adolescent reçoit une information spécifique sur ses droits (accès, rectification, effacement, portabilité, opposition, retrait de consentement).
- Une page dédiée `/parametres/donnees` permet à l'adolescent et à son parent d'exercer ces droits en autonomie.

### K.4 Garanties spécifiques mineurs

- **Aucune publicité comportementale** dérivée du profilage des mineurs n'est servie ni à des tiers transmise.
- **Aucune transmission de données de mineurs à des tiers à des fins commerciales** ne peut intervenir.
- **Aucune messagerie directe avec des inconnus** : la communication entre adolescents est cantonnée aux cercles d'amis approuvés et aux contextes de défis ou de circles encadrés.
- **Couvre-feu transport** : aucun trajet réservé entre 22h00 et 05h00 sans dérogation parentale explicite.
- **Lieux de rencontre marketplace** : restreints aux écoles et aux lieux partenaires KYC.
- **Filtre halal** : par défaut activé sur la livraison de nourriture, avec approbation parentale requise pour tout article non-halal.
- **KYC obligatoire des adultes en interaction** : mentors et chauffeurs sont soumis à un KYC validé par l'équipe Nivy avant toute interaction avec un mineur.
- **Modération de contenu :** tout signalement de comportement inapproprié d'un adulte vis-à-vis d'un mineur déclenche un protocole d'escalade vers l'équipe sécurité, et le cas échéant, vers les autorités compétentes (unité protection de l'enfance).

### K.5 Engagement à l'égard de la CNDP

Nivy s'engage à :

- répondre dans un délai de 30 jours à toute demande d'exercice de droits émanant d'un mineur ou de son parent ;
- notifier la CNDP de tout incident de sécurité affectant des données de mineurs dans un délai de 72 heures ;
- soumettre toute évolution substantielle du traitement (nouvelle finalité, nouveau sous-traitant, nouveau transfert hors UE) à une déclaration complémentaire ;
- coopérer pleinement à tout contrôle CNDP.

---

## L — Pièces justificatives jointes au dossier

1. Extrait modèle J du Registre du Commerce (à fournir par le fondateur).
2. Statuts de la société (à fournir par le fondateur).
3. Pièce d'identité du représentant légal (à fournir).
4. Politique de confidentialité publiée (`app/legal/confidentialite/page.tsx`, version PDF imprimable à générer).
5. Conditions générales d'utilisation (à fournir — version paragraphée pour l'adolescent et version pour le parent).
6. Registre des traitements (`01-registre-des-traitements.md`).
7. Schéma d'architecture technique (à fournir — diagramme des flux de données).
8. Liste des sous-traitants (Annexe A du registre).
9. Politique de sécurité (`docs/vision/audit-prelaunch/07-security-compliance.md`).
10. Modèle d'e-signature et de mention d'information à l'inscription (capture d'écran).

---

## M — Engagements et signature

Le responsable du traitement, représenté par son gérant <<TO_FILL — nom>>, déclare :

- l'exactitude des informations fournies dans le présent dossier ;
- l'engagement à respecter les obligations de la Loi 09-08 et de ses décrets d'application ;
- l'acceptation des contrôles et des injonctions de la CNDP ;
- la nomination ou l'engagement de nommer un Délégué à la Protection des Données dont les coordonnées sont communiquées en partie B ;
- la mise à jour du présent dossier en cas d'évolution substantielle du traitement.

Fait à <<TO_FILL — ville>>, le <<TO_FILL — date>>.

Signature et cachet du responsable :

<<SIGNATURE>>

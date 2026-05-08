# Registre des traitements de données à caractère personnel — Nivy

> **Responsable du traitement :** Nivy SARL (à confirmer — voir document 02)
> **Date de constitution du registre :** 2026-05-08
> **Référence légale :** Loi n° 09-08 du 18 février 2009 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, et son décret d'application n° 2-09-165 du 21 mai 2009.
> **Format :** une fiche par finalité de traitement, conformément à la doctrine CNDP en matière de tenue d'un registre interne (article 12 et suivants — à confirmer auprès du conseil).
> **Périmètre couvert :** toutes les bases de données et tous les supports de stockage de la plateforme Nivy hébergée sur Supabase (projet `imchornjvmgmaovhypco`, région Frankfurt — UE), sur Vercel (UE), avec sous-traitants tiers détaillés en pied de chaque fiche.

## Index des traitements

| # | Finalité | Catégorie de personnes concernées | Niveau de sensibilité |
|---|---|---|---|
| T-01 | Inscription adolescent + autorisation parentale | Mineurs 13-17 ans + parents | **Élevé** (mineurs) |
| T-02 | Authentification et gestion des sessions | Tous utilisateurs | Standard |
| T-03 | Profil adolescent (état civil, scolarité, intérêts) | Mineurs 13-17 ans | **Élevé** (mineurs) |
| T-04 | Profil parent et adresse de paiement | Adultes responsables légaux | Standard |
| T-05 | Comptabilité paiements et e-monnaie (top-up DH → coins, escrow) | Parents + adolescents | **Élevé** (financier + AML) |
| T-06 | Notifications push et e-mails transactionnels | Tous utilisateurs | Standard |
| T-07 | Géolocalisation transport (rides en temps réel) | Mineurs + chauffeurs | **Élevé** (géolocalisation + mineurs) |
| T-08 | Photos et vidéos téléversées (preuves de défis, justificatifs de chores) | Mineurs 13-17 ans | **Élevé** (image de mineurs) |
| T-09 | KYC partenaires (commerçants, mentors, chauffeurs) | Adultes professionnels | **Élevé** (CIN, RIB, registre commerce) |
| T-10 | Enregistrements de sessions de mentorat (PENDING — voir note) | Mineurs + mentors | **Très élevé** — décision fondateur requise |
| T-11 | Modération de contenu et signalements | Tous utilisateurs | Standard |
| T-12 | Analytique comportementale et personnalisation | Tous utilisateurs (mineurs en majorité) | **Élevé** (profilage de mineurs) |
| T-13 | Conservation légale (comptabilité 10 ans, AML 5 ans) | Tous utilisateurs ayant transigé | Standard (obligation légale) |

---

## T-01 — Inscription adolescent + autorisation parentale (e-signature)

**Finalité.** Permettre la création d'un compte adolescent (13-17 ans) sur la plateforme Nivy, conditionnée à l'accord exprès et préalable d'un parent ou représentant légal matérialisé par une e-signature avec téléversement de la pièce d'identité du parent. Cette finalité est constitutive du service : aucun compte adolescent ne peut exister sans qu'une fiche `e_signatures` n'ait été validée.

**Base légale (Loi 09-08 art. 12 — à confirmer).** Consentement express du parent (responsable légal du mineur). Pour le mineur lui-même : consentement éclairé recueilli après la validation parentale, ainsi que l'exécution d'un contrat auquel le mineur (assisté de son parent) souscrit.

**Catégories de données collectées.**

- Adolescent : prénom, nom, date de naissance, ville, e-mail (si renseigné), choix d'avatar, date et heure d'inscription.
- Parent : nom complet (`e_signatures.parent_full_name`), numéro CIN (`e_signatures.parent_cin`), URL de la pièce d'identité numérisée (`e_signatures.cin_url` — pointant vers le bucket privé `cin-scans`), adresse IP de la signature (`e_signatures.ip_address`), horodatage, version des CGU acceptées, version de la politique de confidentialité acceptée.
- Lien : enregistrement dans `parent_teen_links` matérialisant la relation responsable légal / mineur.

**Tables concernées.** `auth.users`, `profiles`, `teens`, `e_signatures`, `parent_teen_links`, `linking_codes`.
**Bucket de stockage.** `cin-scans` (privé).

**Durée de conservation.**

- Pendant toute la vie du compte adolescent + 5 ans à compter de la clôture (la pièce d'identité justifie la levée de la responsabilité parentale et doit être conservée à des fins probatoires).
- Suppression sur demande du parent ou de l'adolescent devenu majeur via le droit à l'effacement (`POST /api/me/data-delete`, délai de grâce 30 jours).

**Destinataires internes.** Équipe sécurité Nivy (admin role), équipe support de niveau 2 sur escalade documentée.
**Destinataires externes.** Aucun en routine. En cas de réquisition judiciaire ou de signalement à l'unité protection de l'enfance, transmission selon procédure légale.

**Transferts hors Maroc.**

- Hébergement de la base : Supabase, région `eu-central-1` (Francfort, Allemagne — UE).
- Hébergement applicatif : Vercel, région UE.
- Le téléversement de la CIN transite via TLS 1.3 vers Supabase Storage à Francfort, puis y reste chiffré au repos (AES-256).

**Mesures de sécurité.**

- Bucket `cin-scans` configuré `public = false` (vérifié en live).
- Politique RLS `cin_self_read` : un parent ne peut lire que la CIN qu'il a lui-même téléversée (jointure `e_signatures.parent_id = auth.uid() AND e.cin_url = objects.name`).
- Aucune route applicative n'utilise `getPublicUrl('cin-scans/...')` (vérifié par grep). Tous les accès passent par des URL signées de courte durée.
- Limite MIME : jpeg / png / webp / pdf uniquement, taille max 5 MB.
- Audit trail dans `admin_audit_logs` pour toute consultation administrateur.

**Risques résiduels.** Compromission du compte parent (mitigation : 2FA disponible, à rendre obligatoire pour les comptes parents — recommandation P1).

---

## T-02 — Authentification et gestion des sessions

**Finalité.** Identifier de manière fiable un utilisateur à chaque connexion, maintenir une session web sécurisée, permettre la déconnexion, prévenir les usurpations.

**Base légale.** Exécution du contrat de service. Intérêt légitime du responsable de traitement à sécuriser ses systèmes (Loi 09-08 art. 12 — base contractuelle).

**Catégories de données.**

- Identifiants : adresse e-mail, mot de passe haché (bcrypt côté Supabase Auth).
- Données techniques : adresse IP de connexion, user-agent du navigateur, jeton de session HTTPOnly + SameSite=Lax, jeton de rafraîchissement, horodatage des connexions et déconnexions.
- 2FA optionnel : code TOTP, codes de récupération.

**Tables concernées.** `auth.users` (gérée par Supabase Auth), `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_factors`.

**Durée de conservation.** Compte actif : indéfinie. Sessions : 7 jours d'inactivité maximum (refresh token expirable). Logs de connexion : 30 jours pour les besoins de sécurité, prolongée à 12 mois en cas d'incident documenté.

**Destinataires.** Aucun externe. Logs auth accessibles à l'équipe sécurité Nivy.

**Transferts hors Maroc.** Supabase Auth (Francfort, UE).

**Mesures de sécurité.**

- TLS 1.3 obligatoire (HSTS strict).
- CSRF double-submit pattern (`x-csrf-token` header vs `csrf-token` cookie) sur toutes les routes non-GET.
- Rate-limiting Upstash sur `/api/auth/*`.
- Hachage bcrypt (Supabase Auth par défaut).
- Cookie de session `httpOnly`, `secure`, `sameSite=lax`.
- CSP avec nonce par requête.
- Re-vérification de l'identité dans chaque layout serveur (defense in depth).

**Risques résiduels.** Pas de verrouillage automatique après N tentatives échouées (Supabase répond 429 mais ne lock pas). Acceptable MVP, à durcir.

---

## T-03 — Profil adolescent

**Finalité.** Personnaliser l'expérience de l'adolescent sur la plateforme : recommandations de défis, missions et contenus alignés sur son âge, sa ville, son école et ses centres d'intérêt déclarés.

**Base légale.** Consentement éclairé de l'adolescent assisté de son parent. Exécution du contrat de service.

**Catégories de données.**

- État civil : `teens.date_of_birth` (date de naissance).
- Localisation déclarée : `teens.city` (ville).
- Scolarité : `teens.school_name`, `teens.grade_level` (niveau scolaire), si renseignés.
- Centres d'intérêt : `teen_full_profile.interests` (tableau de tags), `teen_full_profile.goals`, `teen_full_profile.learning_style`.
- Préférence linguistique : `profiles.preferred_language` (fr / ar).
- Avatar : choix d'avatar et personnalisation (cosmétique uniquement, non biométrique).

**Tables concernées.** `profiles`, `teens`, `teen_full_profile`, `onboarding_progress`.

**Durée de conservation.** Pendant toute la vie du compte. Anonymisation après suppression du compte (préservation des agrégats statistiques sans rattachement à l'identité).

**Destinataires.** Équipe Nivy (lecture restreinte selon RBAC). Parent rattaché via `parent_teen_links` (lecture du tableau de bord d'activité).

**Transferts hors Maroc.** Supabase (Francfort, UE).

**Mesures de sécurité.**

- RLS `profiles_self_read` : `id = auth.uid()` — un adolescent ne peut pas lire le profil d'un autre adolescent.
- Aucun partage à des fins marketing à des tiers (engagement contractuel).
- Modification soumise au pattern Self ou Parent-of-teen.

**Mention spéciale mineurs (Loi 09-08 art. 11 — à confirmer).** Le traitement concerne exclusivement des mineurs. La date de naissance permet de calculer l'âge et de couper le service à la majorité ou de le faire migrer vers un compte adulte. Aucune donnée sensible au sens de l'art. 4 (origine raciale, opinions politiques, convictions religieuses, santé, vie sexuelle) n'est collectée.

---

## T-04 — Profil parent

**Finalité.** Permettre au parent de gérer financièrement et légalement le compte de son adolescent, valider les autorisations per-action, recevoir les notifications de sécurité et de paiement, recevoir les justificatifs de paiement.

**Base légale.** Exécution du contrat. Obligation légale du responsable de traitement (Loi 09-08) de pouvoir contacter le titulaire de l'autorité parentale.

**Catégories de données.**

- Identité : nom complet (`profiles.full_name`).
- Coordonnées : e-mail (`profiles.email`), numéro de téléphone (par `payment_requests.approver_phone` lorsqu'utilisé pour SMS d'approbation).
- Adresse de facturation / paiement : transmise au prestataire de paiement (jamais stockée en clair sur les serveurs Nivy).
- Préférences de notification : `notification_preferences.email_enabled`, push, SMS.

**Tables concernées.** `profiles`, `parent_teen_links`, `payment_requests` (approver_email, approver_phone), `notification_preferences`.

**Durée de conservation.** Pendant toute la vie de la relation contractuelle. Anonymisation 30 jours après clôture du compte parent ET fermeture des comptes adolescents rattachés.

**Destinataires.** Prestataire e-monnaie BAM-agréé (Cash Plus, Wafacash ou M2T), Stripe ou CMI (selon mode de paiement choisi), Resend (envoi e-mail transactionnel).

**Transferts hors Maroc.**

- Stripe : siège Irlande (UE), traitement aux États-Unis avec clauses contractuelles types (à valider).
- Resend : États-Unis avec mécanisme de transfert à valider (clauses contractuelles types ou décision d'adéquation à confirmer).
- Supabase / Vercel : Francfort (UE).

**Mesures de sécurité.**

- Coordonnées bancaires JAMAIS stockées sur Nivy ; tokenisées par le prestataire de paiement.
- Politique RLS scopée à `auth.uid() = parent_id`.
- Notifications signées (HMAC sur signed URLs Resend).
- Numéro de téléphone validé par confirmation OTP avant tout usage SMS.

---

## T-05 — Comptabilité paiements et e-monnaie (top-up DH → coins)

**Finalité.** Convertir les paiements DH des parents en solde de coins (pseudo-monnaie de plateforme à valeur fixée 100 coins = 1 DH), tenir une comptabilité paire (transaction + entrée d'escrow), permettre les dépenses sur les offres partenaires, satisfaire les obligations comptables et anti-blanchiment.

**Base légale.** Exécution du contrat. Obligation légale (réglementation Bank Al-Maghrib sur l'e-monnaie, lutte anti-blanchiment, comptabilité commerciale).

**Catégories de données.**

- `payment_transactions` : `parent_id`, `teen_id`, `amount_dh`, `amount_coins`, `status`, `psp_provider`, `psp_reference`, `failure_reason`, horodatages.
- `escrow_ledger` : entrées paires (top_up, spend, refund, payout), `direction`, `amount_dh`, `amount_coins`, `related_payment_id`, `created_by`.
- `coin_transactions` : journal du solde adolescent (un mouvement par opération), `teen_id`, `amount_coins`, `description`, `related_user_id`.
- `user_coins` : solde courant matérialisé (`teen_id`, `balance_coins`).
- `e_signatures` (référence) : la signature CGU du parent autorisant les top-ups est requise par `top_up_teen` RPC.

**Tables concernées.** `payment_transactions`, `escrow_ledger`, `coin_transactions`, `user_coins`, `partner_payouts`, `payment_requests`.

**Durée de conservation.** **10 ans** à compter de la clôture de l'exercice comptable concerné — obligation comptable marocaine. Les références PSP et les preuves de paiement sont conservées 10 ans pour répondre à toute requête de l'administration fiscale ou de Bank Al-Maghrib.

**Destinataires.**

- Prestataire e-monnaie BAM-agréé (Cash Plus / Wafacash / M2T) : pour le traitement du top-up.
- Stripe / CMI : pour les paiements par carte bancaire.
- Expert-comptable Nivy SARL : pour les écritures de fin d'exercice.
- Bank Al-Maghrib et Direction Générale des Impôts : sur réquisition.

**Transferts hors Maroc.** Stripe (Irlande / US — clauses types), tous les autres restent sur sol marocain ou UE.

**Mesures de sécurité.**

- Aucune donnée de carte bancaire ne touche les serveurs Nivy (PCI-DSS SAQ-A par déport total).
- RPC `top_up_teen` est SECURITY DEFINER avec vérification interne `auth.uid()` pour empêcher l'usurpation.
- Taux de conversion 100 coins = 1 DH **codé en dur** (non flottant), audit immuable.
- `escrow_ledger` est en append-only (aucune route ne fait `UPDATE` ni `DELETE` sur cette table).
- Doublé-comptabilité : chaque mouvement génère exactement deux entrées équilibrées.

---

## T-06 — Notifications push et e-mails transactionnels

**Finalité.** Informer en temps utile les utilisateurs des événements pertinents : approbations parentales requises, top-up confirmé, anniversaire, rappel d'événement, expiration d'une quête, commission ambassadeur perçue.

**Base légale.**

- Notifications transactionnelles strictement nécessaires à l'exécution du service : exécution du contrat.
- Notifications marketing / promotionnelles : consentement opt-in explicite, retirable à tout moment.

**Catégories de données.**

- `user_notifications` : `user_id`, `template_id`, `payload` (JSON), `read_at`, `delivered_at`.
- `notification_preferences` : `user_id`, `email_enabled`, `push_enabled`, `sms_enabled` par catégorie.
- Tokens push : enregistrés côté Supabase Auth (web push subscriptions).
- E-mail : adresse e-mail copiée du profil pour l'envoi via Resend.

**Tables concernées.** `user_notifications`, `notification_preferences`, `notification_templates`, `notification_triggers`, `notification_analytics`.

**Durée de conservation.** Notifications individuelles : 12 mois (purge cron). Statistiques agrégées : 36 mois pour mesure d'efficacité, sans rattachement nominatif.

**Destinataires.**

- Resend (États-Unis) : envoi e-mail.
- Service push Web (Mozilla Push Service / FCM) : livraison push.
- Prestataire SMS (à désigner — Mobiblanc / Inwi Solutions, à confirmer) : SMS d'approbation parentale.

**Transferts hors Maroc.** Resend (US), FCM (US), Web Push (UE Mozilla / US Google).

**Mesures de sécurité.**

- Désinscription en un clic pour les e-mails marketing (lien dans chaque envoi).
- Préférences granulaires par catégorie de notification.
- Pas d'utilisation des tokens push à des fins de tracking publicitaire.

---

## T-07 — Géolocalisation transport (rides en temps réel)

**Finalité.** Sécuriser les trajets des adolescents en transport partenaire (Careem, drivers Nivy KYC) : enregistrer le point de départ, le point d'arrivée, suivre la position du véhicule en temps réel pendant le trajet pour permettre au parent de vérifier que l'adolescent suit l'itinéraire prévu, déclencher le couvre-feu nocturne (22h-05h heure de Casablanca).

**Base légale.** Sécurité du mineur (intérêt vital). Consentement parental préalable (autorisation de chaque ride dans `parental_approvals.action_type='booking'`). Consentement de l'adolescent.

**Catégories de données — particulièrement sensibles : géolocalisation de mineurs.**

- `ride_bookings` : `pickup_address`, `pickup_lat`, `pickup_lng`, `dropoff_address`, `dropoff_lat`, `dropoff_lng`, `teen_id`, `driver_id`, `status`, `cancellation_reason`.
- `ride_tracks` : enregistrements positionnels temps-réel pendant le trajet (`lat`, `lng`, horodatage), une ligne toutes les ~15 secondes.
- `ride_groups` : adresses agrégées pour les trajets partagés.
- `nivy_drivers` : `full_name`, `phone`, `vehicle_plate` du chauffeur (PII chauffeur exposée à l'adolescent et au parent UNIQUEMENT pendant le ride dispatché — RLS à durcir, voir audit P1-3).

**Tables concernées.** `ride_bookings`, `ride_tracks`, `ride_groups`, `nivy_drivers`.

**Durée de conservation.**

- `ride_tracks` (positions GPS détaillées) : **30 jours** après la fin du trajet, puis suppression définitive. Aucune analyse comportementale n'est dérivée des traces GPS.
- `ride_bookings` (adresses, statut) : 24 mois pour traçabilité de service et résolution de litiges, puis pseudonymisation (suppression des adresses précises, conservation des indicateurs agrégés ville→ville).
- En cas d'incident de sécurité ou de procédure judiciaire en cours : conservation prolongée jusqu'à clôture du dossier.

**Destinataires.**

- Chauffeur partenaire : voit l'adresse de pick-up et drop-off du trajet qui lui est assigné, uniquement pour la durée du trajet.
- Parent rattaché via `parent_teen_links` : voit la carte temps-réel pendant le trajet, l'adresse pickup et dropoff après.
- Pas de transmission à des tiers à des fins commerciales.

**Transferts hors Maroc.** Supabase (Francfort, UE). Si un fournisseur de cartographie tiers (Mapbox / Google Maps) est utilisé, les coordonnées transitent par leur infrastructure (US) — clauses contractuelles types à valider.

**Mesures de sécurité.**

- Curfew enforcement : aucune ride scheduled entre 22h00 et 05h00 (heure locale Casablanca) sans autorisation parentale explicite (`ride_bookings.curfew_override = true`).
- Cron daily 22h00 UTC qui annule toute ride active hors créneau.
- Politique RLS `nivy_drivers` à durcir (audit P1-3) pour exposer le téléphone et la plaque du chauffeur uniquement aux comptes adolescent et parent du ride en cours.
- `ride_tracks` accessible uniquement à l'adolescent, au parent rattaché et au chauffeur du trajet.

**Mention spéciale mineurs.** Géolocalisation d'un mineur — traitement à risque élevé. Justifié par l'intérêt vital de sécurité et soumis à autorisation préalable parentale par ride. Le parent peut désactiver le service transport pour son adolescent à tout moment.

---

## T-08 — Photos et vidéos téléversées (preuves de défis, justificatifs de chores)

**Finalité.** Permettre à l'adolescent de prouver l'accomplissement d'un défi physique (selfie / vidéo) ou d'une corvée parentale (photo de la chambre rangée, des courses faites), pour valider le gain XP / coins associé. Permettre au parent ou au modérateur de visionner la preuve.

**Base légale.** Consentement de l'adolescent au moment du téléversement. Validation parentale au moment de la création du défi / chore.

**Catégories de données.**

- Fichiers image / vidéo : selfie, photo d'objet, vidéo courte (10 MB max, formats jpeg / png / webp / mp4 / mov).
- Métadonnées : nom de fichier, MIME, taille, horodatage, défi / chore associé.

**Buckets de stockage.** `defi-proofs` (privé), `chore-evidence` (privé), `physical-challenge-images` (PUBLIC — à AUDITER ; ce bucket public ne doit contenir que des templates non identifiants ; vérifier qu'aucune route n'y téléverse des selfies de mineurs).

**Durée de conservation.** 12 mois après validation. Suppression à la demande de l'adolescent ou du parent à tout moment via `/parametres/donnees`.

**Destinataires.** Adolescent lui-même, parent rattaché, équipe modération Nivy (en cas de signalement).

**Transferts hors Maroc.** Supabase Storage (Francfort, UE). Aucun transfert hors UE.

**Mesures de sécurité.**

- Buckets `defi-proofs` et `chore-evidence` : `public = false` (vérifié en live).
- Politique RLS `defi_proof_visibility` : visible à l'adolescent ou au parent rattaché via `parent_teen_links`.
- MIME allow-list stricte (jpeg / png / webp / mp4 / quicktime).
- Limite de taille : 10 MB par fichier.
- Accès via URL signées de courte durée (5 min recommandé).
- Aucun appel à `getPublicUrl('defi-proofs/...')` dans le code (vérifié par grep).

**Risque résiduel à corriger.** Bucket `physical-challenge-images` est public — vérifier qu'il sert uniquement de cosmétique catalogue et non de stockage de preuves identifiantes (P1 audit).

---

## T-09 — KYC partenaires (commerçants, mentors, chauffeurs)

**Finalité.** Vérifier l'identité et la légitimité commerciale des partenaires (commerçants, mentors, chauffeurs Nivy) avant qu'ils ne puissent vendre, accompagner ou transporter des mineurs. Conformité aux obligations anti-blanchiment et à la diligence raisonnable de la plateforme.

**Base légale.** Obligation légale (lutte anti-blanchiment, due diligence pour la sécurité des mineurs). Exécution du contrat partenaire.

**Catégories de données.**

- `partners` : raison sociale, e-mail, ICE, RC.
- `partner_staff` : rôle (owner / staff), `user_id`, lien au partner.
- `kyc_documents` : `partner_id`, `doc_type` (CIN / RC / ICE / RIB), `file_path` (pointant vers `kyc-documents` bucket), `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `owner_user_id`, `subject_kind`.
- `mentors` : `kyc_status`, `kyc_documents_url`.
- `nivy_drivers` : `kyc_status`, `kyc_documents_url`, `full_name`, `phone`, `vehicle_plate`.

**Buckets.** `kyc-documents` (privé), `cin-scans` (privé — partagé avec T-01).

**Durée de conservation.** **5 ans** à compter de la fin de la relation contractuelle (obligation AML marocaine standard — à confirmer auprès du conseil et de Bank Al-Maghrib).

**Destinataires.** Équipe Nivy (admins habilités au KYC). Bank Al-Maghrib, autorités fiscales et judiciaires sur réquisition.

**Transferts hors Maroc.** Supabase Storage Francfort (UE).

**Mesures de sécurité.**

- Bucket `kyc-documents` : `public = false`.
- Politique RLS `kyc_owner_read` : un staff partenaire avec rôle `owner` peut lire les documents de son employeur ; les rôles `staff` ne peuvent pas.
- Policy admin `kyc_admin_read` à ajouter pour permettre la review depuis `/admin/kyc` (audit P2-8).
- MIME allow-list (jpeg / png / webp / pdf), 5 MB max.

---

## T-10 — Enregistrements de sessions de mentorat

> **STATUT : EN ATTENTE DE DÉCISION FONDATEUR (V1.2-A).**
> **CETTE FICHE N'EST PAS À DÉCLARER TANT QUE LA DÉCISION N'EST PAS PRISE.**
> **Nécessite validation explicite du conseil juridique sur la légalité au regard de la Loi 09-08 et du droit à l'image des mineurs.**

**Finalité (envisagée).** Enregistrer audio + vidéo des sessions de mentorat 1-1 entre un adolescent (13-17) et un mentor adulte, à des fins de protection (preuve en cas de signalement de comportement inapproprié), de qualité (review par responsable mentorat), et de remédiation (l'adolescent peut revoir la session avec son parent).

**Bucket envisagé.** `mentor-recordings` (privé — déjà créé en base, voir liste de buckets).

**Base légale envisagée.** Double consentement : du mentor (adulte, professionnel) ET du parent du mineur, recueilli explicitement avant chaque session via une case à cocher dédiée. Le mineur doit également être informé en début de session.

**Catégories de données.** Fichiers audio + vidéo, transcription automatique éventuelle (NLP), métadonnées de session (durée, participants).

**Durée de conservation envisagée.** **90 jours** maximum, puis suppression définitive automatique. Exception : si un signalement est ouvert pendant la période de conservation, l'enregistrement est conservé jusqu'à clôture du dossier.

**Destinataires envisagés.** Équipe modération Nivy (admin role spécifique `mentor_review`). Parent du mineur sur demande motivée (droit d'accès art. 21 — à confirmer). Autorités sur réquisition.

**Transferts hors Maroc.** Supabase Storage Francfort (UE) uniquement.

**Risques majeurs identifiés.**

1. Captation d'image et de voix de mineurs — soumise à un régime spécial de consentement renforcé.
2. Risque de fuite catastrophique — un seul enregistrement compromis exposerait identité, voix, image, contexte familial d'un mineur.
3. Risque réputationnel si perçu comme intrusif.
4. Question juridique non résolue : un parent peut-il consentir à l'enregistrement d'une conversation qui se déroulera entre son enfant et un tiers, par anticipation ?

**Recommandation au fondateur.**

- **Option A (la plus sûre) :** ne PAS enregistrer ; la modération se fait par signalement du mineur ou du parent + journalisation des seules métadonnées (heure, durée, mentor, mentee). Cette option est la seule à présenter un dossier CNDP simple.
- **Option B :** enregistrement audio uniquement (pas de vidéo) avec double consentement signé, conservation 30 jours (et non 90), suppression cron quotidien, et accès uniquement sur signalement formel. Soumis à autorisation préalable CNDP avec dossier substantiel.
- **Option C :** enregistrement audio + vidéo conformément à la fiche ci-dessus. **Forte probabilité de refus CNDP** sans plaidoirie soignée et présence d'un DPO certifié.

**Action requise.** Décision fondateur + validation conseil juridique avant toute mise en service de cette fonctionnalité. Cette fiche ne fait pas partie du dossier de déclaration CNDP initial tant que la décision n'est pas prise. Recommandation : lancer V1 sans enregistrement, ajouter en V2 si nécessaire avec déclaration complémentaire.

---

## T-11 — Modération de contenu et signalements

**Finalité.** Détecter, reviewer et traiter les contenus inappropriés ou les comportements à risque sur la plateforme (annonces marketplace, posts du feed, signalements de mentor, signalements d'adolescent à adolescent).

**Base légale.** Intérêt légitime du responsable de traitement à protéger les mineurs et à respecter la loi pénale marocaine. Obligation légale en matière de protection de l'enfance.

**Catégories de données.**

- `moderation_queue` : contenu signalé, type de signalement, signaleur (`reporter_user_id`), cible (`target_user_id`, `target_resource_id`), statut, décision modérateur, motif.
- `mentor_session_reports` : signalements spécifiques aux sessions de mentorat.
- `mentor_strikes` : suivi disciplinaire des mentors (3 strikes = suspension).

**Tables concernées.** `moderation_queue`, `mentor_session_reports`, `mentor_strikes`, `admin_audit_logs`.

**Durée de conservation.** 36 mois après clôture du signalement (durée de prescription de l'action publique pour les délits — à confirmer).

**Destinataires.** Équipe modération Nivy. Autorités sur réquisition (notamment unité protection de l'enfance).

**Transferts hors Maroc.** Supabase (Francfort, UE) uniquement.

**Mesures de sécurité.**

- RLS scopée à l'équipe modération (`admin_roles.role IN ('admin','moderator')`).
- Audit trail dans `admin_audit_logs` pour chaque décision.
- Pas d'accès en lecture pour le signaleur après dépôt du signalement (anonymisation pour la cible).

---

## T-12 — Analytique comportementale et personnalisation

**Finalité.** Personnaliser l'expérience de l'adolescent : recommander les bons défis, missions, contenus, mentors, en fonction de son comportement passé sur la plateforme. Mesurer l'engagement et la rétention. Détecter les signaux faibles de désengagement ou de mal-être (recommandation IA-safety).

**Base légale.** Consentement éclairé pour la personnalisation. Intérêt légitime du responsable de traitement pour la mesure d'audience anonymisée.

**Catégories de données.**

- `behavioral_signals` : `teen_id`, `signal_type` (action effectuée), `weight`, horodatage. Capture chaque action significative (quizz commencé, défi terminé, post liké, etc.).
- `affinity_scores` : `teen_id`, `category`, `score` — scores d'affinité dérivés des signaux pour pondérer les recommandations.
- `user_lifetime_stats` : statistiques agrégées par utilisateur.
- `user_share_stats`, `user_sharing_stats` : statistiques de partage social.
- Vercel Analytics : mesure d'audience anonymisée côté frontend.

**Tables concernées.** `behavioral_signals`, `affinity_scores`, `user_lifetime_stats`, `content_reliability_scores`, `platform_averages`.

**Durée de conservation.** Signaux bruts : 18 mois glissants. Scores agrégés : indéfinis tant que le compte est actif. Anonymisation à la suppression du compte.

**Destinataires.** Internes uniquement. Aucune transmission à un tiers à des fins de profilage publicitaire.

**Transferts hors Maroc.** Supabase (Francfort, UE), Vercel Analytics (UE).

**Mesures de sécurité.**

- Aucun profilage à finalité commerciale tierce.
- Aucune décision automatisée à effet juridique au sens de l'art. 22 RGPD (équivalent Loi 09-08 — à confirmer art. correspondant).
- Pas de croisement avec des sources externes.
- Désactivable via les préférences utilisateur (opt-out de la personnalisation).

**Mention spéciale mineurs.** Profilage de mineurs — traitement à risque élevé. Justifié par la finalité de personnalisation pédagogique et de sécurité, jamais à des fins publicitaires. Le parent peut désactiver la personnalisation pour son adolescent.

---

## T-13 — Conservation légale (comptabilité 10 ans, AML 5 ans)

**Finalité.** Conserver, conformément aux obligations légales marocaines, les pièces comptables, les pièces de paiement et les documents KYC pendant les durées légales applicables, postérieurement à la clôture du compte ou de la relation contractuelle.

**Base légale.** Obligations légales :

- Code de commerce marocain : conservation des livres comptables et pièces justificatives **10 ans**.
- Réglementation anti-blanchiment (loi 43-05 — à confirmer art.) : conservation des documents KYC **5 ans** après fin de relation.
- Code des obligations et contrats : conservation des contrats pendant la prescription quinquennale.

**Catégories de données conservées au-delà de la clôture du compte.**

- `payment_transactions` : 10 ans.
- `escrow_ledger` : 10 ans.
- `coin_transactions` (rattachées à un mouvement DH) : 10 ans.
- `partner_payouts` : 10 ans.
- `e_signatures` : 5 ans (preuve de l'autorisation parentale).
- `kyc_documents` : 5 ans après fin de relation partenaire.
- `admin_audit_logs` : 36 mois (durée d'investigation interne raisonnable).

**Statut des données.** Pseudonymisées à la clôture du compte (substitution des identifiants utilisateur par un hash non-réversible) lorsque la finalité comptable n'exige pas l'identifiabilité directe. Le rattachement à l'identité réelle est conservé sur un canal séparé chiffré, accessible uniquement sur réquisition légale ou pour la production de pièces fiscales.

**Destinataires.** Expert-comptable, administration fiscale, Bank Al-Maghrib, autorité judiciaire — uniquement sur demande légale documentée.

**Transferts hors Maroc.** Supabase (Francfort, UE) — données stockées en UE même au-delà de la clôture.

**Mesures de sécurité.**

- Backups chiffrés (Supabase managed) — rétention 30 jours en backup chaud, archivage froid à définir pour les 10 ans.
- Accès aux données pseudonymisées soumis à journalisation systématique.
- Procédure documentée de re-identification sur demande légale (avec contre-signature DPO et conseil juridique).

---

## Annexes

### Annexe A — Liste consolidée des sous-traitants (Loi 09-08 art. 25 — à confirmer)

| Sous-traitant | Service | Localisation principale | Données traitées | Mécanisme de transfert |
|---|---|---|---|---|
| Supabase Inc. | Hébergement DB + Storage + Auth | Francfort (Allemagne, UE) | Toutes | Hébergement UE |
| Vercel Inc. | Hébergement applicatif | UE (Francfort) | Logs, requêtes HTTP | Hébergement UE |
| Sentry | Suivi d'erreurs | UE (Francfort) | Stack traces anonymisées | Hébergement UE |
| Resend | Envoi e-mail transactionnel | États-Unis | Adresse e-mail, contenu transactionnel | Clauses contractuelles types (à valider) |
| Upstash | Rate limiting + cache | UE | Hash d'identifiants techniques | Hébergement UE |
| Cash Plus | E-monnaie BAM-agréée | Maroc | Identité parent, montant top-up | Hébergement Maroc |
| Wafacash | E-monnaie BAM-agréée | Maroc | Identité parent, montant top-up | Hébergement Maroc |
| M2T | E-monnaie BAM-agréée | Maroc | Identité parent, montant top-up | Hébergement Maroc |
| Stripe (optionnel) | Paiement carte bancaire | Irlande / US | Tokens carte, montant | Clauses contractuelles types |
| CMI | Paiement carte bancaire local | Maroc | Tokens carte, montant | Hébergement Maroc |

### Annexe B — Tables PII inventoriées (issues de l'introspection live du projet `imchornjvmgmaovhypco`)

Tables contenant directement de la PII : `profiles`, `teens`, `e_signatures`, `nivy_drivers`, `partners`, `linking_codes`, `payment_requests`, `ride_bookings`, `ride_groups`, `ride_tracks`, `food_orders` (delivery_address), `events` (address), `sport_clubs`, `event_check_ins`, `users`, `admin_audit_logs` (ip_address), `data_deletion_requests` (ip_address).

### Annexe C — Buckets de stockage inventoriés

| Bucket | Public | Contenu | Sensibilité |
|---|---|---|---|
| `cin-scans` | Non | CIN parents | Très élevée |
| `kyc-documents` | Non | RC, ICE, RIB partenaires | Élevée |
| `defi-proofs` | Non | Photos / vidéos défis ados | Élevée |
| `chore-evidence` | Non | Photos chores ados | Élevée |
| `mentor-recordings` | Non | (À DÉCIDER — voir T-10) | Très élevée |
| `user-exports` | Non | Exports JSON CNDP | Élevée |
| `event-images` | Oui | Images marketing événements | Faible |
| `partner-logos` | Oui | Logos partenaires | Faible |
| `avatar-assets` | Oui | Cosmétique avatar | Nulle |
| `physical-challenge-images` | Oui | À AUDITER — vérifier qu'il ne contient pas de selfies de mineurs | À confirmer |

### Annexe D — Mention spéciale "Données concernant des mineurs" (Loi 09-08 art. 11 — à confirmer)

Le présent registre couvre, pour la majorité de ses traitements, des données à caractère personnel concernant des mineurs âgés de 13 à 17 ans. À ce titre, l'ensemble des traitements ci-dessus est soumis au régime renforcé de la Loi 09-08 :

- Consentement parental préalable matérialisé par e-signature avec téléversement de la CIN du parent.
- Information adaptée à l'âge délivrée à l'adolescent au moment de l'inscription et accessible en permanence dans la politique de confidentialité (https://nivy.ma/legal/confidentialite).
- Aucune publicité comportementale dérivée du profilage des mineurs.
- Aucune transmission de données de mineurs à des tiers à des fins commerciales.
- Possibilité pour le parent de demander l'effacement total des données de son adolescent à tout moment.
- Désignation d'un Délégué à la Protection des Données (DPO) — voir document 02 pour le statut actuel.
- Soumission du dossier à la procédure d'**autorisation préalable** (et non simple déclaration) auprès de la CNDP, en raison du caractère sensible (mineurs + géolocalisation + profilage).

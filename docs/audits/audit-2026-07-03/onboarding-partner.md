# Audit — Onboarding Partner

> Date : 2026-07-03 · Branche `refonte/home-nav-lifestyle` · Mode read-only.
> Audits antérieurs consultés (non ré-découverts) : `docs/audits/orchestrator-2026-05/onboarding-partner.md`,
> `docs/compliance/09-partner-ecosystem-compliance.md`, `docs/compliance/wave-3a{,.5}-partner-*.md`,
> `docs/compliance/wave-3b{1,2,3}-partner-*.md`. Ces 5 vagues (2026-05-09) prétendent un score
> 22→89/100 et « closed-beta ready ». Cet audit **revérifie ligne à ligne** ce qui est réellement
> câblé aujourd'hui sur la branche courante — verdict : la plupart des affirmations tiennent, mais
> **le maillon le plus important de la boucle (scan → vente) est cassé bout-en-bout au niveau UI**,
> ce que les vagues précédentes n'ont pas détecté car leurs tests ciblent les routes API isolément,
> jamais l'intégration UI→API réelle.

## Routes inspectées

Pitch public : `app/partenaires/page.tsx`, `app/partenaires/merci/page.tsx`, `app/devenir-partenaire/page.tsx`,
`app/devenir-partenaire/inscription/page.tsx`, `app/devenir-partenaire/merci/page.tsx`, `app/devenir-partenaire/kyc/page.tsx`.

Espace partenaire authentifié : `app/partner/page.tsx` (+ `dashboard/page.tsx` redirect), `app/partner/kyc/page.tsx`,
`app/partner/settings/page.tsx`, `app/partner/offers/{page,new/page,[id]/edit/page}.tsx`, `app/partner/scanner/page.tsx`,
`app/partner/payouts/page.tsx`, `app/partner/transactions/page.tsx`, `app/partner/invoices/page.tsx`,
`app/partner/stats/page.tsx`, `app/partner/support/page.tsx`.

Backend : `app/api/partners/wizard/submit/route.ts`, `app/api/partners/register/route.ts`,
`app/api/admin/partners/[id]/{activate,approve,reject}/route.ts`, `app/api/admin/partners/offers/[id]/decision/route.ts`,
`app/api/admin/partners/[id]/kyc-token/route.ts`, `app/api/admin/partners/kyc/[doc_id]/decision/route.ts`,
`app/api/partner/{offers,offers/[id],settings,kyc/upload,kyc/upload-with-token,verify-card,apply-discount,scanner/apply}/route.ts`,
`app/api/teen/vip-qr/route.ts`, `app/api/cron/partner-payout-monthly/route.ts`, `lib/partners/wizard-submit.ts`,
`lib/partner/qr-v2.ts`, `lib/partners/kyc-token.ts`.

Admin : `app/admin/partners/page.tsx`, `app/admin/partners/partner-review-row.tsx`, `app/admin/partners/offers/page.tsx`.

## État actuel (résumé 5 lignes)

Signup, KYC, moderation d'offre et activation admin sont **réellement câblés** sur `partners` /
`partner_pending_credentials` / `kyc_documents` / `partner_offers`, avec un gate admin strict (aucune
mise en ligne automatique). Mais **deux pages « merci » concurrentes** coexistent et le formulaire
poste vers la mauvaise (l'ancienne, avec `partners@example.com` en dur). Le **scanner QR** est le
point le plus critique : le backend v2 sécurisé (`nivy:v1` + HMAC + nonce + RPC atomique) existe des
deux côtés (émission `teen/vip-qr`, vérification `scanner/apply`) mais **la page `/partner/scanner`
n'appelle ni l'un ni l'autre correctement** — elle route tout vers l'ancien `apply-discount` non
atomique, et `verify-card` rejette explicitement les QR `nivy:v1:` en répondant `wrong_endpoint`.
Concrètement : scanner le vrai QR d'un ado aujourd'hui échoue. La liste des offres affiche
« En pause » pour un deal en attente de modération, ce qui contredit le message de succès juste
précédent. Le reste (payouts/invoices/settings/awaiting-approval) est honnête et fonctionnel.

## Niveau "pro" (1-5) avec justification

**3 / 5.**
- Backend de la boucle argent (signup → KYC → activation admin → création offre → transaction →
  cron payout → facture) est réel, testé, avec RLS/service-role correctement séparés → tirerait vers 4.
- Mais le point de contact le plus visible et le plus testé par un partenaire réel — scanner une
  carte et conclure une vente — est cassé en pratique dès qu'un vrai QR `nivy:v1` est présenté, et
  personne ne l'a détecté car les tests couvrent l'API en isolation, pas le chemin UI. Un doublon de
  page merci avec email fake visible en prod-like. Ça plafonne à 3.

## Données : statique/mocké vs API réelle

| Étape | UI | API/Persistance | Réel/Mock |
| ----- | -- | --------------- | --------- |
| Pitch public | `app/partenaires/page.tsx` (V10) + `app/devenir-partenaire/page.tsx` (legacy) | statique (copie + pricing) | Réel (contenu), mais **doublon** de landing |
| Merci | `app/partenaires/merci/page.tsx` **(utilisée en vrai)** | lit `?ref=` réel | Réel, mais copie datée + `partners@example.com` codé en dur (l.139) |
| Merci (orpheline) | `app/devenir-partenaire/merci/page.tsx` | idem `?ref=` | Réel mais **jamais atteinte** — 0 caller |
| Signup wizard | `RetailPartnerForm`/`Venue`/`Club`/`Education` + `MinimalArchetypeWizard` | `POST /api/partners/wizard/submit` → `partners`, `partner_pending_credentials`, `partner_locations`, `partner_offers(draft)` | Réel, atomique (rollback si échec enfant) |
| KYC upload | `PartnerKycUploader` sur `/partner/kyc` | `POST /api/partner/kyc/upload` → bucket privé `kyc-documents` + `kyc_documents` | Réel, jamais `getPublicUrl` |
| KYC pré-auth | `app/devenir-partenaire/kyc/page.tsx` (token signé) | `POST /api/partner/kyc/upload-with-token` | Réel |
| Activation admin | `partner-review-row.tsx` bouton « Activer » | `POST /api/admin/partners/[id]/activate` → `auth.admin.inviteUserByEmail` + `partner_staff` + `profiles.role` | Réel, atomique 6 étapes, idempotent |
| Dashboard KPI | `app/partner/page.tsx` | `partner_discounts` (VIEW legacy) pour offres + `partner_transactions` (table réelle) pour CA | Réel mais **deux sources** pour la même page |
| Créer offre | `app/partner/offers/new/page.tsx` | `POST /api/partner/offers` → `status='pending_approval', is_active=false` | Réel, moderation gate respectée |
| Liste offres | `app/partner/offers/page.tsx` | lit `is_active` seulement (pas `status`) | Réel mais **affiche mal** l'état modération |
| Modération offre | `app/admin/partners/offers/page.tsx` | `POST /api/admin/partners/offers/[id]/decision` | Réel |
| QR émission (ado) | **aucune UI** (`/teen/vip-card` n'affiche pas de QR) | `GET /api/teen/vip-qr` (signe `nivy:v1`) | Backend réel, **0 appelant UI** |
| Scan (identif. carte) | `app/partner/scanner/page.tsx` | `POST /api/partner/verify-card` | Réel mais rejette `nivy:v1:` (renvoie `wrong_endpoint`) |
| Scan (appliquer vente) | `app/partner/scanner/page.tsx` → `handleApplyDiscount` | `POST /api/partner/apply-discount` (legacy, RMW non atomique) | Réel mais **pas le chemin canonique** ; `scanner/apply` (RPC atomique, HMAC, nonce) existe et n'est jamais appelé par cette page |
| Transactions | `app/partner/transactions/page.tsx` | `partner_transactions` | Réel |
| Payouts | `app/partner/payouts/page.tsx` | `partner_payouts` (cron mensuel) | Réel, empty state honnête |
| Factures | `app/partner/invoices/page.tsx` | `partner_invoices` (trigger sur payout) | Réel |
| Settings | `app/partner/settings/page.tsx` + `partner-settings-form.tsx` | `GET/PATCH /api/partner/settings`, allow-list champs | Réel (mock supprimé Wave 3B.3, revérifié présent) |
| Awaiting-approval | `components/dashboard/partner/awaiting-approval.tsx` | lit `partners.status` | Réel, honnête |

## Cohérence avec le reste de l'app

- **KYC ↔ Stripe/Connect** : aucune intégration Stripe Connect ou Identity trouvée sous `app/partner/kyc` ni `lib/payments/`.
  KYC = upload de documents (CIN, RC, ICE, RIB…) vers bucket privé + revue manuelle admin, **pas** Stripe Identity. Payouts
  également ne passent pas par Stripe Connect — `partner_payouts` est une table interne alimentée par cron, sans référence
  `stripe_account_id`. `lib/stripe.ts` sert le paiement ado→plateforme (top-up wallet), pas partenaire→banque. Cohérent avec
  le choix produit documenté (paiements adossés dirham / cadre BAM, cf. copie `/partenaires`), mais à nommer explicitement :
  **il n'y a pas de "vrai" payout bancaire automatisé, juste un calcul + une ligne DB** (aucun virement SEPA/RIB déclenché).
- **Scanner ↔ check-in API** : `app/api/check-in/` sert le flux réservations/événements (billetterie), pas le scanner
  boutique. Le scanner partenaire est un système séparé (`verify-card` + `apply-discount`/`scanner/apply`) — pas de
  confusion de route trouvée, mais **deux implémentations concurrentes du même geste métier** (voir ci-dessus), l'une
  câblée (legacy, non sécurisée) et l'autre orpheline (v2, sécurisée). C'est la même incohérence que si `check-in` avait
  deux endpoints jamais réconciliés.
- **Payouts ↔ transactions ledger** : chaîne réelle et propre — `apply-discount` écrit `partner_transactions(status='succeeded')`
  → `app/api/cron/partner-payout-monthly/route.ts` agrège par mois → `partner_payouts` → trigger → `partner_invoices`. Cette
  partie de la boucle est solide, peu importe laquelle des deux routes d'application écrit la transaction (les deux le font).

## Gaps bloquants (P0)

1. **(a) CASSÉ — le scanner ne peut pas traiter un vrai QR ado.**
   `app/partner/scanner/page.tsx:56` appelle `POST /api/partner/verify-card`. Celui-ci, à
   `app/api/partner/verify-card/route.ts:68-78`, **rejette explicitement** tout payload `nivy:v1:` avec
   `{ error: "wrong_endpoint", message: "Use POST /api/partner/scanner/apply for nivy:v1 QR." }`. Or
   `app/api/teen/vip-qr/route.ts` (le seul générateur de QR ado, confirmé : zéro autre appelant de
   cette route dans le repo) émet exclusivement des payloads `nivy:v1:...`. Résultat : scanner le QR
   d'un vrai ado renvoie une erreur, jamais un membre identifié. Le flux `TPVIP:` legacy (seul format
   que `verify-card` accepte par défaut) est désactivé par défaut (`ALLOW_LEGACY_TPVIP_QR≠true`) et de
   toute façon plus émis nulle part côté teen. **Seule voie qui fonctionne aujourd'hui : la recherche
   manuelle par numéro de carte** (`handleManualSearch`, `app/partner/scanner/page.tsx:77-83`), qui shortcut tout HMAC/nonce.
   Effort : **M (1-2 j)** — brancher `verify-card`/scanner UI sur `scanner/apply`, ou générer le QR
   dans `/teen/vip-card` et faire lire ce format par le scanner en un seul chemin.

2. **(a) CASSÉ / (d) DETTE — application de la vente non atomique malgré RPC dispo.**
   `app/partner/scanner/page.tsx:154` poste vers `POST /api/partner/apply-discount`, dont
   `app/api/partner/apply-discount/route.ts:190-195` fait encore l'incrément read-modify-write
   documenté « CLOSED » dans `wave-3a-partner-truth.md` (`current_total_uses: (offer.current_total_uses || 0) + 1`).
   Le RPC atomique `apply_partner_offer` (SECURITY DEFINER, row-lock, nonce, nommé "CLOSED" dans les
   5 vagues) est bien câblé — mais uniquement dans `app/api/partner/scanner/apply/route.ts:163-170`,
   route jamais appelée par l'UI. Deux scans concurrents de la même offre peuvent donc encore
   dépasser le plafond `max_total_uses`. Effort : **S (0.5-1 j)** une fois le point 1 résolu (même fix).

3. **(a) CASSÉ / (d) DOUBLON — deux pages "merci" concurrentes, la mauvaise est utilisée.**
   Les 4 formulaires legacy (`RetailPartnerForm.tsx:251`, `VenuePartnerForm.tsx:276`,
   `ClubPartnerForm.tsx:219`, `EducationPartnerForm.tsx:230`) et `MinimalArchetypeWizard.tsx:42`
   redirigent tous vers `router.push('/partenaires/merci?ref=...')` — l'**ancienne** page
   (`app/partenaires/merci/page.tsx`), qui contient encore `partners@example.com` (l.139) en dur et un
   style pré-charte (gradients `from-teal to-pink`). La page `app/devenir-partenaire/merci/page.tsx`
   a été construite ensuite (commentaire l.11 : « remplace le placebo /partenaires/merci ») avec la
   bonne charte et sans email fake, mais **personne n'y redirige** — 0 caller trouvé (`grep` sur tout
   le repo). Le partenaire termine son inscription sur une page marquée comme "placebo" par son
   propre successeur. Effort : **S (0.25-0.5 j)** — changer les 5 redirections vers
   `/devenir-partenaire/merci`, supprimer ou rediriger `app/partenaires/merci`.

## Gaps importants (P1)

4. **(c) MANQUANT vs standard pro — l'état de modération d'une offre est invisible pour le partenaire.**
   `app/partner/offers/page.tsx:112` ne sélectionne que `is_active` (pas `status`). Ligne 204-231 : le
   badge affiche **"En pause"** aussi bien pour une offre `pending_approval` (vient d'être créée,
   attend l'admin) que pour une offre `rejected` ou manuellement mise en pause. Ceci contredit
   directement le message de succès affiché juste après création
   (`app/partner/offers/new/page.tsx:192` : *"Ton deal passe en modération, on te ping dès que c'est live"*)
   — le partenaire ne peut ensuite plus distinguer "en attente" de "refusé" de "je l'ai coupé
   moi-même". Effort : **S (0.5 j)** — select `status` + badge à 4 états (pending/approved/rejected/paused).

5. **(c) MANQUANT — mot de passe choisi à l'inscription silencieusement jeté.**
   `app/api/admin/partners/[id]/activate/route.ts:160-205` : le mot de passe saisi via
   `PartnerPasswordPanel` au wizard (`RetailPartnerForm.tsx` l.77-78 etc.) est haché et stocké dans
   `partner_pending_credentials`, mais au moment de l'activation admin, **le hash n'est jamais
   consommé pour créer le compte** — le code appelle `inviteUserByEmail` (commentaire l.160-169
   explicite : *"The wizard-chosen password is discarded with this strategy"*) et force le
   partenaire à redéfinir un mot de passe via lien email. Le champ mot de passe du wizard existe
   donc uniquement pour satisfaire la validation front — c'est un mot de passe fantôme. Aucune copie
   sur les formulaires n'avertit l'utilisateur que ce mot de passe ne servira pas. Effort :
   **S (0.5 j)** de copie honnête ("tu recevras un email pour définir ton mot de passe"), ou **M (1-2j)**
   pour réellement consommer le hash si on veut honorer le choix utilisateur.

6. **(d) DETTE — `app/partner/page.tsx` lit deux sources pour la même donnée.**
   Lignes 33-38 et 82-88 lisent `partner_discounts` (VIEW legacy sur `partner_offers`, compat
   Wave 3A) pour compter/lister les offres actives, tandis que lignes 44-55 lisent
   `partner_transactions` (table canonique) pour le CA. Fonctionnellement correct aujourd'hui (la vue
   reflète `partner_offers`), mais documenté comme "sunset compatibility shim — remove after Wave 2
   PT1 audit" depuis mai — jamais fait. Effort : **S (0.5 j)** — remplacer les 2 lectures par
   `partner_offers` direct.

7. **(c) MANQUANT — pas de Stripe Connect / payout bancaire réel.**
   `partner_payouts` est calculé et stocké en DB par un cron (`app/api/cron/partner-payout-monthly/route.ts`),
   mais aucun virement n'est déclenché (pas de `stripe_account_id`, pas d'appel `stripe.transfers.create`
   trouvé dans `lib/stripe.ts` ou `lib/payments/`). Le partenaire voit un montant "dû" sans mécanisme
   de règlement automatisé — probablement un virement manuel hors-app aujourd'hui. Ce n'est pas
   nécessairement un blocage produit (beta fermée), mais la landing `/partenaires` promet "Payout sous
   7 jours" (`app/partenaires/page.tsx:78-79`) sans que le code documente comment ce virement se
   matérialise. Effort : **L (3-5 j)** si Stripe Connect est le choix cible ; **S** si c'est
   volontairement un process manuel à documenter comme tel.

8. **(a) CASSÉ (mineur) — `/teen/vip-card` n'affiche aucun QR scannable.**
   `app/teen/vip-card/vip-card-client.tsx` ne référence ni `QRCode`, ni `/api/teen/vip-qr`, ni
   `card_number` sous forme d'image scannable (confirmé par grep, 0 résultat). Un ado ne peut donc
   physiquement présenter aucun QR au partenaire aujourd'hui — la seule route qui produit le format
   attendu par `scanner/apply` n'est appelée par aucun écran. Combiné au P0 #1, la boucle complète
   "ado a une carte → ado montre son QR → partenaire scanne" n'existe nulle part dans l'UI livrée.
   Effort : **M (1 j)** — afficher le QR signé sur `/teen/vip-card` en consommant `GET /api/teen/vip-qr`.

## Polish (P2)

9. **(b) MOCK / faux contenu — deux landing pages publiques concurrentes.** `/partenaires` (V10,
   charte à jour, pricing par verticale : 8/10/12/15%) et `/devenir-partenaire` (styling gradient
   pré-charte, pas de pricing affiché, juste "validation 48h"). Les deux pointent vers le même
   `/devenir-partenaire/inscription`. Pas bloquant fonctionnellement, mais SEO/marque incohérents —
   à trancher : `/devenir-partenaire` doit-il rediriger vers `/partenaires` ou rester la version
   "form-only" ? Effort : **S (0.5 j)**.
10. **(d) DETTE — `activity_logs`/`admin_audit_logs` vs `audit_log`.** Confirmé fixé dans les routes
    principales du wizard/activate (écrivent bien `audit_log`), non ré-audité en profondeur sur
    toutes les routes secondaires (support, invoices) — risque de traîne mineure, à vérifier en
    passant. Effort : **S (0.5 j)**.
11. **(c) MANQUANT — pas de notification proactive au partenaire au passage pending→active** au-delà
    de l'email d'invitation Supabase Auth générique (pas de template produit dédié observé). Effort : **S (0.5 j)**.

## Effort estimé (S/M/L par gap)

| # | Gap | Sévérité | Effort |
|---|-----|----------|--------|
| 1 | Scanner ne lit pas le format QR ado réel | P0 | M |
| 2 | Apply-discount non atomique (RPC orphelin) | P0 | S (couplé à #1) |
| 3 | Doublon page merci, mauvaise version utilisée | P0 | S |
| 4 | Statut modération offre invisible pour le partenaire | P1 | S |
| 5 | Mot de passe wizard jeté silencieusement | P1 | S–M |
| 6 | Dashboard lit `partner_discounts` (vue legacy) au lieu de `partner_offers` | P1 | S |
| 7 | Pas de virement bancaire réel derrière `partner_payouts` | P1 | S–L (selon ambition) |
| 8 | Ado n'a aucun QR affiché nulle part | P1 | M |
| 9 | Deux landings publiques concurrentes | P2 | S |
| 10 | Résidus `activity_logs`/`admin_audit_logs` | P2 | S |
| 11 | Pas de notif produit dédiée à l'activation | P2 | S |

**Total ~5-8 j** pour fermer P0+P1 (le cœur : reconnecter scanner UI ↔ routes v2 déjà écrites, corriger le double merci, exposer le vrai statut d'offre).

## Fichiers critiques à connaître

- `app/partner/scanner/page.tsx` — UI scanner, appelle les mauvaises routes (l.56 `verify-card`, l.154 `apply-discount`).
- `app/api/partner/verify-card/route.ts:68-78` — rejette `nivy:v1:` avec `wrong_endpoint`.
- `app/api/partner/apply-discount/route.ts:190-195` — RMW non atomique toujours actif en prod.
- `app/api/partner/scanner/apply/route.ts` — pipeline v2 complet (HMAC, nonce, RPC), jamais atteint par une UI.
- `app/api/teen/vip-qr/route.ts` — seul générateur de QR `nivy:v1`, zéro appelant UI.
- `app/teen/vip-card/vip-card-client.tsx` — n'affiche aucun QR.
- `components/partners/{Retail,Venue,Club,Education}PartnerForm.tsx` + `MinimalArchetypeWizard.tsx` — redirigent vers `/partenaires/merci` (ancienne page).
- `app/partenaires/merci/page.tsx` (utilisée, email fake l.139) vs `app/devenir-partenaire/merci/page.tsx` (orpheline, correcte).
- `app/partner/offers/page.tsx:112,204-231` — badge "En pause" ambigu (ne lit pas `status`).
- `app/api/admin/partners/[id]/activate/route.ts:160-205` — mot de passe wizard jeté, `inviteUserByEmail` à la place.
- `app/api/partners/wizard/submit/route.ts` — signup atomique, réel, bien fait (référence positive).
- `app/api/cron/partner-payout-monthly/route.ts` — cron réel, aucun virement bancaire déclenché.
- `docs/compliance/wave-3a-partner-truth.md` + `wave-3a5/wave-3b{1,2,3}` — vagues qui ont câblé le backend documenté ici ; leurs tests ne couvrent pas l'intégration UI, d'où la régression non détectée.

# Synthèse audit Nivy — 2026-07-03

Branche `refonte/home-nav-lifestyle` · post-V11 + qr-onboarding (HEAD `a5662f4`).
Croisement des 8 rapports d'audit avec les **28 issues ouvertes V12→V16** (+ 14 issues V10 committées).
Rapports détaillés : voir `./architecture.md`, `./homepage.md`, `./gamification.md`, `./quiz.md`, `./rewards.md`, `./reservation.md`, `./onboarding-parent.md`, `./onboarding-partner.md`. Map des issues : `./_github-issues-map.md`.

## Verdict global

Le produit est **nettement plus solide que ce que le PO craint** sur les surfaces déjà remédiées (routing gamification consolidé, XP non convertible respecté, onboarding parent QR/magic-link vivant, quiz solo réel, home ado-first honnête sans preuve sociale fabriquée). Les remédiations V1→V11 tiennent : vérifiées en dur, pas seulement documentées.

Le retard vers un niveau **professionnel/compétitif** est concentré sur **3 axes** :
1. **Boucles E2E qui cassent sur du drift de schéma résiduel** (colonnes fantômes `bookings.parent_id`, `teens.full_name`, `children`) → paiements/PDF/scanner partenaire morts en bout de chaîne.
2. **Chrome/plomberie beta** (crash `/auth/redirect`, ring-fence admin trompeur, badges VIP « Free ») = les 4 hotfixes V12.
3. **Dette d'architecture non résolue** : Supabase clients non typés (cause racine du drift jamais attrapé par `tsc`), 2 moteurs missions/défis parallèles, doc économique en dérive.

## Tableau récap (8 zones)

| Zone | Score pro (1-5) | P0 | P1 | P2 | Verdict 1-ligne |
|------|-----------------|----|----|----|-----------------|
| Architecture | 3.5 | 2 | 4 | 5 | Clients Supabase non typés = drift invisible à tsc ; 2 toast systems dont 1 mort |
| Homepage | 4 | 1 | 4 | 2 | Home honnête & réelle ; maillage cassé (/parents, /temoignages orphelins) + image 404 |
| Gamification | 3.5 | 1(dette) | 8 | 5 | P0 mai/juin corrigés vérifiés ; 2 moteurs missions parallèles = dette de fond |
| Quiz | 4 | 0 | 3 | 4 | Solo réel & solide ; multi absent ; ~1300 lignes quiz mortes en double |
| Rewards | 3.5 | 1 | 4 | 3 | Redirects tiennent ; VIP recompenses = boutons `disabled` morts ; doc economy.md périmée |
| Reservation | 2.5 | 3 | 3 | 3 | Cash live ; paiement carte/PDF/mobile-money cassés par drift `parent_id`/`children` |
| Onboarding parent | 4 | 0 | 3 | 2 | Chemin critique QR/KYC/e-sign vivant ; wizard pré-compte parent = cul-de-sac |
| Onboarding partner | 3 | 1 | 3 | 2 | Signup/KYC/admin réels ; **1re vente cassée** (scanner rejette le QR VIP réel) |

## Top 10 incohérences inter-zones

1. **Drift `bookings.parent_id` (canon `user_id`)** touche reservation (mobile-money `initiate/route.ts:38`, tickets `generate-pdf/route.ts:22-34`) ET check-in export (issue #323) — même racine, 3 sites. → **couvert partiellement #323**, mais #323 ne vise que l'export.
2. **Drift `teens.full_name` / table `children`** (canon `first_name`/`last_name`, `teens`) : reservation PDF + `app/parent/approvals/page.tsx`. → **NON couvert par une issue.**
3. **Clients Supabase non typés** (`lib/supabase/{server,client,service-role}.ts` sans `<Database>`) = cause racine structurelle de TOUS les drifts ci-dessus, jamais attrapés par `tsc` malgré `strict:true`. → **NON couvert** (V13 traite les symptômes drift, pas la cause).
4. **Deux systèmes de toast**, dont le shadcn jamais monté → toasts de confirmation de paiement (`components/ticket-actions.tsx`) invisibles sur `app/reservation/confirmation/page.tsx`. → **NON couvert.**
5. **QR VIP cassé bout-en-bout** : le seul générateur `app/api/teen/vip-qr/route.ts` (payload `nivy:v1:`) n'a aucun appelant UI, et le scanner `verify-card/route.ts:68` rejette justement `nivy:v1:`. → recoupe **#328** (boucle scanner E2E) mais #328 parle tokens/rédemption, pas le QR VIP carte.
6. **Boutons `disabled` hardcodés servant de « pas encore implémenté »** : VIP recompenses (rewards), `/teen/games` (gamification), admin réservations moderation (reservation), admin gamification-setup. Pattern transverse « faux CTA ».
7. **Docs de référence en dérive vs code** : `docs/economy.md` (coins dits non-câblés alors que réels), `docs/GAMIFICATION_V2_EVOLUTION.md`, `docs/ARCHITECTURE.md` (décrit `(dashboard)`/`(public)` jamais construits). Un dev qui les lit reproduit des bugs déjà corrigés.
8. **Deux moteurs missions/défis quotidiens** (`user_challenges` via `features/gamification` vs `user_missions` via `gamification-system`) alimentent le même hub `/teen/quests` sans réconciliation → risque double-comptage XP. → **NON couvert.**
9. **Pages/landings orphelines de maillage** : `/parents`, `/temoignages` (homepage) ; `/teen/games`, `app/daily` (gamification) ; `app/devenir-partenaire/merci` (partner). Contenu construit mais inatteignable.
10. **Code mort volumineux en double** : quiz (`api/teen/education/quizzes`, `components/education/quiz-player.tsx` ~840 l., `api/teen/quiz/daily`), `components/reservation-form.tsx`, `components/features/home/home-events-section.tsx`, `elite-ai-companion.tsx`. Dette de suppression, pas de bug.

## Top 10 actions P0 (impact / effort)

1. **[V12 #317] Supprimer le double page-transition framer-motion** qui crashe `/auth/redirect` (« Rendered more hooks »). Bloque la connexion. `app/auth/redirect/page.tsx` + template racine. — S.
2. **[reservation] Corriger drift `parent_id`→`user_id`** dans `app/api/payments/mobile-money/initiate/route.ts:38` + `app/api/tickets/generate-pdf/route.ts:22-34` (+ `children`→`teens`, `full_name`→`first/last_name`). Débloque paiement mobile + PDF billet. — M.
3. **[partner] Réparer la 1re vente** : câbler le QR VIP `nivy:v1:` à un appelant UI (`app/teen/vip-card/vip-card-client.tsx`) OU faire accepter le format par `verify-card/route.ts` ; router l'« apply » vers l'RPC atomique `apply_partner_offer` (`app/api/partner/scanner/apply/route.ts`) au lieu de `apply-discount` non-atomique. — M. Recoupe #328.
4. **[V12 #320] Ring-fence HTTP `/admin/scripts-sql` & `/admin/permissions`** (200 trompeur via loading.tsx). Sécurité. — S.
5. **[V12 #318] Seeder les pivots d'abonnement parent VIP** (sidebar « Free » au lieu de Silver/Gold/Platinum). `scripts/seed-beta-pivots.ts` existe déjà (non committé). — S.
6. **[V12 #319] Corriger `alt` manquant** des avatars teens sur `/parent` (6 erreurs console next/image). — S.
7. **[rewards] VIP recompenses : retirer les boutons `disabled` morts** ou câbler le redeem réel (`app/carte-vip/recompenses/page.tsx`). Actuellement lecture réelle mais 0 action possible. — S/M.
8. **[reservation] Réactiver ou retirer honnêtement le webhook Stripe** (`app/api/webhooks/stripe/dispatcher.ts` = `⚠️ INACTIF`) : sinon un paiement Stripe test ne confirme jamais la réservation. Recoupe #342. — M.
9. **[architecture] Typer les 3 clients Supabase avec `<Database>`** (`types/supabase.ts` existe, 12,7k lignes, inutilisé) → transforme tous les drifts futurs en erreurs `tsc`. Prévention racine. — M.
10. **[architecture] Monter le `<Toaster>` shadcn manquant** ou migrer `ticket-actions.tsx` vers sonner → confirmations de paiement redeviennent visibles. — S.

## Classement des trouvailles vs issues GitHub existantes

### Déjà couvert par une issue ouverte (exécuter l'issue)
- Crash `/auth/redirect` framer-motion → **#317** (P0).
- Badge VIP « Free » / seed pivots → **#318** (P0).
- Alt avatars `/parent` → **#319** (P0).
- Ring-fence admin scripts-sql/permissions → **#320** (P0).
- Drift `bookings.parent_id` export check-in → **#323** (P1) — MAIS élargir aux 2 autres sites (mobile-money, tickets PDF).
- Drift-lint faux positifs `profiles.pseudo` → **#322** (P1).
- Circles moderation `circle_messages.user_id` → **#324** (P1).
- `parent_teen_links` unicité → **#325** (P1).
- Boucle E2E scanner partenaire (tokenize→scan→rédemption) → **#328** (P1) — recoupe la 1re vente cassée mais ne couvre PAS le QR VIP `nivy:v1:`.
- Composants tokens orphelins (transfer/daily-claim) → **#329** (P1).
- Smoke runbook connecté → **#327** ; moderation_queue fixtures → **#330**.
- Features gated (driver/coach/support/sport_clubs/pathways/top-up DH) → **#332-#337** (P1/P2).
- Rotation secrets, Web Vitals, a11y, E2E Stripe/QR check-in CI, Sentry → **#339-#343** (V16 pré-lancement).

### Nouvelles trouvailles (à signaler — PAS couvertes par une issue)
- **[N1/P0]** Drift `teens.full_name` + table `children` inexistante dans PDF billet & `parent/approvals` — au-delà de #323.
- **[N2/P0]** Clients Supabase non typés (`<Database>` absent partout) — cause racine du drift, aucune issue ne l'adresse.
- **[N3/P0]** Deux systèmes de toast, shadcn jamais monté → toasts paiement invisibles.
- **[N4/P0]** QR VIP `nivy:v1:` sans appelant UI + rejeté par le scanner (1re vente partenaire cassée) — #328 ne couvre que la voie token.
- **[N5/P0]** VIP recompenses = boutons redeem tous `disabled` (page morte).
- **[N6/P1]** Webhook Stripe `⚠️ INACTIF` (dispatcher commenté) — #342 vise le test E2E, pas la réactivation du code.
- **[N7/P1]** Deux moteurs missions/défis (`user_challenges` vs `user_missions`) non réconciliés.
- **[N8/P1]** Maillage cassé : `/parents` & `/temoignages` orphelins (0 lien entrant, absents du sitemap) ; image 404 `app/page.tsx:205`.
- **[N9/P1]** Wizard onboarding pré-compte parent = cul-de-sac (`parent-setup-step.tsx:59-77` bypasse `onNext`) ; `sync_onboarding_to_user` (RPC réel) sans aucun appelant → XP/coins pré-compte jamais crédités.
- **[N10/P1]** Docs de référence périmées (`economy.md`, `GAMIFICATION_V2_EVOLUTION.md`, `ARCHITECTURE.md`) décrivant du code disparu/faux.
- **[N11/P2]** ~1300+ lignes de quiz mort en double (`components/education/quiz-player.tsx`, `api/teen/education/quizzes`, `api/teen/quiz/daily`) + `reservation-form.tsx` + `home-events-section.tsx` + `elite-ai-companion.tsx` = dette de suppression.
- **[N12/P2]** Pas d'endpoint cancel/refund réservation ; pages moderation admin en boutons `disabled` ; `/mes-reservations` lien mort sans page.
- **[N13/P2]** Métadonnées SEO manquantes sur `/a-propos` & `/temoignages` ; `manifest.ts` theme_color cyan hors charte.

## Chemin critique vers prod-quality

**Wave P0 — Hotfix beta + boucles E2E cassées (exécutée dans ce pipeline)**
Cible : rendre l'app démontrable de bout en bout. Débloque : connexion, paiement, 1re vente partenaire, sécurité admin.
- Issues V12 : #317, #318, #319, #320.
- Nouvelles P0 : N1 (drift PDF/approvals), N3 (toast paiement), N5 (VIP recompenses morts).
- (N2 typage Supabase & N4 QR VIP & N6 Stripe = P0 mais effort M → wave P0.5 si build reste vert, sinon P1.)

**Wave P1 — Fiabilité & drift racine (V13 + nouvelles)**
Dépend de : rien de bloquant. Cible : éliminer la classe entière de bugs drift.
- N2 (typer clients Supabase) EN PREMIER → transforme #322/#323/#324/#325 en vérifications tsc.
- Puis #322-#325, N4, N6, N7 (2 moteurs missions), N8 (maillage), N9 (wizard parent).

**Wave P2 — Parcours E2E testés (V14)**
- #327, #328, #330 + smoke exécutables ; réactiver/tester Stripe & CMI ; cancel/refund.

**Wave P3 — Features produit gated (V15)**
- #332-#337 (arbitrages PO : driver, coach/teacher, support, sport_clubs, pathways, top-up DH licence e-money).

**Wave P4 — Pré-lancement (V16)**
- #339-#343 : secrets, Web Vitals, a11y, E2E CI, Sentry. + nettoyage code mort N11.

## Index des rapports détaillés
- [architecture](./architecture.md)
- [homepage](./homepage.md)
- [gamification](./gamification.md)
- [quiz](./quiz.md)
- [rewards](./rewards.md)
- [reservation](./reservation.md)
- [onboarding-parent](./onboarding-parent.md)
- [onboarding-partner](./onboarding-partner.md)
- [map des issues GitHub](./_github-issues-map.md)

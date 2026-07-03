# Audit — Reservation

**Baseline** : branche `refonte/home-nav-lifestyle`, 2026-07-03. Lecture seule.
**Scope** : flow event booking ado/parent `/reservation` → paiement → confirmation → approbation parentale → check-in partenaire/admin. (Le shop XP `/teen/shop/checkout` est un flow SÉPARÉ, déjà audité 2026-05, non retraité ici sauf pour noter le chevauchement des tests E2E.)

## Routes inspectées

- `app/reservation/page.tsx`, `app/reservation/paiement/page.tsx`, `app/reservation/confirmation/page.tsx`, `app/reservation/approbation/page.tsx`, `app/reservation/error.tsx`, `app/reservation/loading.tsx`, `app/reservation/paiement/error.tsx`
- `components/reservation-form.tsx`, `components/reservation-stepper.tsx`, `components/payment-method-selector.tsx`, `components/payment-cart-persistence.tsx`, `components/payment-expiry-redirect.tsx`, `components/ticket-actions.tsx`
- `app/agenda/[id]/page.tsx` (entrée "Réserver")
- `app/parent/approvals/page.tsx`, `components/parent/approval-buttons.tsx`, `app/api/parent/approvals/route.ts`
- `app/partner/scanner/page.tsx` (hors-scope réel — VIP card, pas check-in event), `app/admin/check-in/page.tsx`, `components/check-in-interface.tsx`
- `app/admin/reservations/page.tsx`, `app/admin/reservations/[id]/page.tsx`
- `app/api/bookings/create/route.ts` (seule route du dossier)
- `app/api/payments/{xp,stripe/create-session,cmi/initiate,cmi/webhook,cmi/callback,mobile-money/initiate,cash/create,process,hybrid}/route.ts`
- `app/api/check-in/{entry,exit,verify-pass,search,stats,export}/route.ts`
- `app/api/tickets/generate-pdf/route.ts`
- `app/api/webhooks/stripe/dispatcher.ts`, `lib/payments/cmi.ts`
- `gamification-system/database/migrations/129_event_booking_opposition_rpcs.sql`

## État actuel (résumé 5 lignes)

Le flow `/reservation` → `/reservation/paiement` → `/reservation/confirmation` est réel et cohérent avec le schéma actuel (`bookings.user_id`, `booking_tickets`, `parental_approvals` en modèle opt-out). Le check-in event (`/api/check-in/entry` + `/api/check-in/verify-pass`) est solide et bien réaligné (schéma réel, idempotence). Mais le paiement carte est éteint par défaut (Stripe/CMI/Mobile Money tous en feature flag `false`), le paiement XP est mort en pratique (prop `teenId` jamais transmise au sélecteur), 3 routes annexes (`mobile-money/initiate`, `tickets/generate-pdf`, ancien `components/reservation-form.tsx`) référencent encore l'ancien schéma (`parent_id`, table `children`) et cassent en usage réel. Aucune capacité admin de force-confirm/refund/regénération de billet n'existe (le fichier l'assume explicitement). Aucune route d'annulation/remboursement ado-initiée, aucun test E2E sur ce flow précis.

## Niveau "pro" (1-5) avec justification

**Score : 2/5**

- Le squelette (booking → paiement UI → confirmation → opposition parentale → check-in) est structurellement correct et le check-in est le composant le plus mature de tout l'audit.
- Mais aucun rail de paiement carte n'est activé en pratique (flags par défaut off), le "paiement hybride XP" annoncé dans `AUDIT_COMPLET_PROJET.md` est UI-dead sur ce parcours précis, il n'existe aucune annulation/remboursement self-service, aucun outil admin de rattrapage, et 3 fichiers actifs pointent vers un schéma disparu (échoueraient en production s'ils étaient exercés).
- Un score de 3+ demanderait : au moins un rail de paiement carte réellement activable + testé, le paiement XP branché, un cancel/refund self-service, et le nettoyage des 3 fichiers cassés.

## Données : statique/mocké vs API réelle

| Étape | Page | API | Mock/Réel |
| ----- | ---- | --- | --------- |
| Sélection événement | `app/agenda/[id]/page.tsx` | `events` (Supabase) | Réel |
| Création booking | `app/reservation/page.tsx` → form POST | `app/api/bookings/create/route.ts` | Réel (insert `bookings` + `booking_tickets`, QR généré) |
| Vérif budget / approbation préalable | `app/api/bookings/create/route.ts:58-107` | `checkTeenBudget` + `parental_approvals` (`purchase_above_ceiling`) | Réel |
| Opposition parentale post-booking | `app/api/bookings/create/route.ts:153-181` | `parental_approvals` (`event_booking`) + RPC `parent_approve_booking`/`parent_deny_booking` (migration 129) | Réel |
| Choix moyen de paiement | `app/reservation/paiement/page.tsx` + `components/payment-method-selector.tsx` | 4 méthodes proposées | **Réel mais toutes gated `false` sauf cash** (`useFeatureFlag('stripe_payment', false)`, `cmi_payment`, `mobile_money_payment`) |
| Paiement XP (hybride) | `components/payment-method-selector.tsx:227` | `app/api/payments/xp/route.ts` (RPC `deduct_xp_for_payment`, atomique) | **API réelle mais UI morte** : `teenId` non transmis par `paiement/page.tsx` → bloc XP ne s'affiche jamais |
| Paiement carte Stripe | `app/api/payments/stripe/create-session/route.ts` | `createCheckoutSession` (lib/stripe réel) | Réel côté création session, **mais webhook retour est explicitement `⚠️ INACTIF`** (voir dispatcher) |
| Paiement CMI | `app/api/payments/cmi/{initiate,webhook,callback}` | `lib/payments/cmi.ts` (HASH réel, pas de stub) | Réel et bien blindé (HASH obligatoire, idempotent), mais flag off par défaut |
| Paiement Mobile Money | `app/api/payments/mobile-money/initiate/route.ts` | `mobileMoneyService` | **CASSÉ** — requête `.eq('parent_id', user.id)` sur `bookings` (colonne inexistante, canon = `user_id`) |
| Paiement cash ambassadeur | `app/api/payments/cash/create/route.ts` | Update `bookings` | Réel, bien réaligné au schéma |
| Ticket / QR | `app/reservation/confirmation/page.tsx` | `booking.booking_reference` encodé en QR (`QRCodeSVG`) | Réel |
| Téléchargement PDF billet | `components/ticket-actions.tsx` → `app/api/tickets/generate-pdf/route.ts` | — | **CASSÉ** — `.eq('parent_id', user.id)` + embed `children (*)` (table inexistante) |
| Check-in événement | `app/admin/check-in` + `components/check-in-interface.tsx` | `/api/check-in/entry`, `/verify-pass` | Réel, bien réaligné (schéma actuel, idempotent) |
| Admin — liste réservations | `app/admin/reservations/page.tsx` | `bookings` + résolution manuelle `profiles` | Réel |
| Admin — actions (relance paiement / marquer présent / annuler) | `app/admin/reservations/[id]/page.tsx:163-175` | — | **Boutons désactivés, aucune route serveur** (commenté explicitement dans le fichier) |
| Composant `reservation-form.tsx` | `components/reservation-form.tsx` | insert direct `bookings` avec `parent_id`, `qr_code`, `status:'confirmed'` sans paiement | **Mort/orphelin** — non importé nulle part dans `app/`, schéma ancien (colonnes disparues) |

## Cohérence avec le reste de l'app

- **Parental approval** : deux mécanismes distincts et bien nommés dans le code — (1) `purchase_above_ceiling` = validation PRÉALABLE si budget dépassé (bloque le booking tant que non approuvé) ; (2) `event_booking` = OPPOSITION post-hoc (le booking est déjà `confirmed`, chaque parent lié — hors celui qui réserve — reçoit 7 jours pour s'opposer via `parent_deny_booking`, qui annule le booking). Ce modèle opt-out est cohérent avec le reste de l'app (V6 collectif, food, ride). **Mais `app/parent/approvals/page.tsx:88-123`** (`getApprovalIcon`/`getApprovalTypeName`) ne connaît PAS la valeur `event_booking` — seulement `booking` (legacy) — donc dans la file d'attente parent, une opposition event_booking s'affiche avec une icône générique et le type brut non traduit (`event_booking` affiché tel quel au lieu de "Réservation événement").
- **Nom du teen dans la file parent** : `app/parent/approvals/page.tsx:42-45` sélectionne `teen:teen_id(id, full_name)` — `teens` n'a pas de colonne `full_name` (canon = `first_name`/`last_name`/`pseudo`, confirmé migration 079). Le nom du teen n'apparaîtra probablement pas dans la carte d'approbation.
- **Gamification / check-in** : `/api/check-in/entry` ne déclenche AUCUN XP, AUCUN achievement, AUCUNE notification parent au moment du scan (contrairement à d'autres modules V6 comme `event_challenges` qui donnent du XP bonus sur check-in de groupe — non câblé ici pour le check-in individuel simple).
- **Refund sur opposition** : `parent_deny_booking` (migration 129) annule le booking (`status='cancelled'`) mais ne déclenche NI remboursement Stripe/CMI NI recrédit XP/coins si le booking était déjà payé — trou de cohérence avec le rail financier (`spend_teen_coins`/`escrow_ledger`) qui, lui, gère bien le refund pour le collectif (`refund_group_split`, audit V6).
- **Doublon paiement** : deux composants "hybride XP + carte" coexistent dans l'app — `components/payment-method-selector.tsx` (event booking, celui audité ici) et le sélecteur du `teen/shop/checkout` (shop XP, audité en 2026-05). Logiques quasi identiques, non partagées.

## Gaps bloquants (P0)

1. **CASSÉ** — `app/api/payments/mobile-money/initiate/route.ts:38` : `.eq('parent_id', user.id)` sur `bookings` (colonne inexistante). Toute tentative de paiement Mobile Money échoue (booking introuvable → 404 même si l'utilisateur est le bon owner). *Fichier : `app/api/payments/mobile-money/initiate/route.ts:34-39`.*
2. **CASSÉ** — `app/api/tickets/generate-pdf/route.ts:22-34` : `.eq('parent_id', user.id)` + embed `children (*)` (table inexistante, canon = `teens`). Le bouton "Télécharger PDF" du billet (`components/ticket-actions.tsx:71`) échoue systématiquement pour tout utilisateur. *Fichier : `app/api/tickets/generate-pdf/route.ts:22-34`.*
3. **MANQUANT vs standard pro** — Aucune route `app/api/bookings/{cancel,refund}` : `app/api/bookings/` ne contient QUE `create/route.ts`. Un ado/parent ne peut annuler ni demander de remboursement self-service. La seule voie d'annulation est l'opposition parentale (`event_booking`), qui ne rembourse pas.
4. **MOCK/faux contenu** — Paiement XP hybride annoncé (docs/audits/AUDIT_COMPLET_PROJET.md, "paiement hybride XP") : l'API (`/api/payments/xp`, RPC `deduct_xp_for_payment`) est réelle et atomique, mais **inatteignable dans ce flow** car `components/payment-method-selector.tsx` reçoit `teenId=undefined` (`app/reservation/paiement/page.tsx:92` : `<PaymentMethodSelector bookingId={bookingId} />`, pas de `teenId`). Le bloc `childTeenId && !xpLoading` (ligne 227) ne rend donc jamais. *Fichiers : `app/reservation/paiement/page.tsx:90-98`, `components/payment-method-selector.tsx:21,197,227`.*
5. **CASSÉ (implicite)** — Aucun rail de paiement carte n'est actif par défaut : `stripe_payment`, `cmi_payment`, `mobile_money_payment` sont tous à `false` (`components/payment-method-selector.tsx:34-36`). Seul `cash` reste actif. Un event payant sans ambassadeur assigné est donc, en pratique, impayable en carte aujourd'hui. Ce n'est pas un bug de code mais un état de config qui rend le flow "paiement réel" INACTIF en production tant que les flags ne sont pas levés — à documenter explicitement pour la prochaine décision produit.
6. **DETTE/doublon** — `components/reservation-form.tsx` est du code mort (aucun import trouvé dans `app/`) qui insère directement dans `bookings` avec des colonnes disparues (`parent_id`, `qr_code`, `status:'confirmed'` sans paiement réel) — risque de confusion/réintroduction accidentelle. À supprimer ou clairement marquer `@deprecated`.

## Gaps importants (P1)

7. **MANQUANT** — `app/admin/reservations/[id]/page.tsx:163-175` : les 3 actions admin (relancer paiement, marquer présent, annuler) sont des boutons `disabled` sans route serveur. L'admin ne peut ni force-confirmer, ni rembourser, ni régénérer un billet.
8. **MANQUANT / DETTE** — `app/parent/approvals/page.tsx:88-123` (`getApprovalIcon`/`getApprovalTypeName`) ne mappe pas `event_booking` (seulement l'ancien `booking`) → dans la file d'attente parent, l'opposition sur réservation event s'affiche avec icône/texte génériques au lieu d'un libellé clair "Réservation événement".
9. **DETTE (drift)** — `app/parent/approvals/page.tsx:42-45` : select `teen:teen_id(id, full_name)` — colonne `full_name` absente de `teens` (canon `first_name`/`last_name`/`pseudo`). Risque que le nom du teen n'apparaisse pas dans la carte d'approbation parentale.
10. **MANQUANT vs standard pro** — Pas de job d'expiration serveur pour les bookings `pending_payment` au-delà des 10 minutes (`app/reservation/paiement/page.tsx:51` calcule `sessionExpiry` côté client uniquement ; `PaymentExpiryRedirect` ne fait qu'un redirect client, ne touche pas la DB). Un booking abandonné reste `pending_payment` indéfiniment en base — pollution + double-booking potentiel (voir #11).
11. **MANQUANT vs standard pro** — Pas de contrainte unique DB sur `bookings`/`booking_tickets` empêchant un même teen de réserver deux fois le même événement/type de billet (seule `group_bookings`, migration 139, a une `UNIQUE(event_id, teen_id, group_action_id)`). Double-booking non bloqué côté serveur pour le flow individuel.
12. **CASSÉ (lien mort, déjà connu)** — `/mes-reservations` référencé comme cible de redirect (`components/payment-expiry-redirect.tsx:12,27`) et dans `next.config.mjs`/`app/robots.ts`, mais aucune page n'existe à ce chemin (déjà documenté dans `docs/vision/audit-frontend-reality/A3-broken-links.md` — cité ici pour confirmer que ce n'est PAS corrigé au 2026-07-03).
13. **MANQUANT** — Aucun test E2E ne couvre `/reservation` → `/reservation/paiement` → `/reservation/confirmation`. Le seul spec existant (`tests/e2e/checkout.spec.ts`) cible `/teen/shop/checkout` (flow shop XP, différent du flow event booking audité ici) — confirme et précise le P0 B1 de l'audit 2026-05 (0 couverture, mais pour le BON flow cette fois).
14. **MANQUANT** — Check-in individuel (`/api/check-in/entry`) ne déclenche aucun side-effect (XP, notification parent, achievement) au scan — alors que `event_challenges` (V6) donne du XP bonus pour check-in de groupe. Incohérence d'attentes UX entre "scan solo" (silencieux) et "scan groupe" (récompensé).

## Polish (P2)

15. Le QR encodé en confirmation (`booking.booking_reference`, `app/reservation/confirmation/page.tsx:98`) est un identifiant PARTAGÉ pour tout le booking, pas un QR par ticket individuel — cohérent avec `check-in/entry` qui résout le premier ticket du booking (`limit(1)`), mais fragile si un booking contient plusieurs billets/teens (le scan ne désambiguïse pas quel enfant se présente en premier).
16. `app/reservation/page.tsx` (le formulaire initial) est en réalité un flow **parent** (labels "Tes coordonnées", sélection d'un teen lié) malgré son classement "teen-side" dans le périmètre d'audit — à clarifier dans la doc produit/nav (qui initie la réservation : le parent ou l'ado ?).
17. `app/partner/scanner/page.tsx` scanne des cartes VIP/offres partenaires, PAS des billets d'événement — le vrai scanner "check-in" vit dans `app/admin/check-in` uniquement. Aucune UI dédiée "partenaire scanne les billets à l'entrée d'un lieu" n'existe (seul un admin peut check-in).
18. Emails de confirmation dépendent de `RESEND_API_KEY` (sinon `console.warn` silencieux, `app/api/payments/xp/route.ts:309`) — pas de fallback in-app si l'email échoue.

## Effort estimé (S/M/L par gap)

| # | Gap | Effort |
|---|---|---|
| 1 | Fix mobile-money `parent_id`→`user_id` | S (0.5 j-h) |
| 2 | Fix tickets/generate-pdf schema drift | S (0.5-1 j-h) |
| 3 | Route cancel/refund self-service ado/parent | M (2-3 j-h) |
| 4 | Brancher `teenId` dans PaymentMethodSelector (paiement XP réel) | S (0.5 j-h) |
| 5 | Décision produit + activation flags paiement carte (Stripe/CMI/Mobile Money) | M (dépend config PSP réels, 1-2 j-h code + validation compte marchand) |
| 6 | Supprimer/marquer `@deprecated` `reservation-form.tsx` | S (0.25 j-h) |
| 7 | Actions admin (relance/présent/annuler) — routes serveur | M (2 j-h) |
| 8 | Mapper `event_booking` dans `getApprovalIcon`/`getApprovalTypeName` | S (0.25 j-h) |
| 9 | Fix select `full_name`→`first_name`/`last_name` dans approvals | S (0.25 j-h) |
| 10 | Job serveur d'expiration bookings pending | M (1-2 j-h, cron/edge function) |
| 11 | Contrainte unique anti double-booking | S (0.5 j-h migration) |
| 12 | Créer `/mes-reservations` ou rediriger vers route existante | S (0.5-1 j-h) |
| 13 | Spec E2E `/reservation` → paiement → confirmation | M (1-2 j-h) |
| 14 | XP/notif sur check-in individuel | M (1 j-h) |

## Fichiers critiques à connaître

- `app/reservation/page.tsx` — création booking (formulaire parent), redirige vers `/api/bookings/create`
- `app/api/bookings/create/route.ts` — seule route bookings ; budget check, opposition parentale, QR, signal analytics
- `gamification-system/database/migrations/129_event_booking_opposition_rpcs.sql` — RPCs `parent_approve_booking`/`parent_deny_booking`
- `app/reservation/paiement/page.tsx` + `components/payment-method-selector.tsx` — sélection paiement, bug `teenId` manquant
- `app/api/payments/xp/route.ts` — RPC `deduct_xp_for_payment`, atomique, réel mais orphelin dans ce flow
- `app/api/payments/mobile-money/initiate/route.ts` — CASSÉ (`parent_id`)
- `app/api/tickets/generate-pdf/route.ts` — CASSÉ (`parent_id` + `children`)
- `app/api/webhooks/stripe/dispatcher.ts` — commentaire explicite "INACTIF", écrit vers tables/colonnes disparues si jamais réactivé tel quel
- `app/api/payments/cmi/webhook/route.ts` — le plus solide du lot (HASH obligatoire, idempotent)
- `app/api/check-in/entry/route.ts`, `app/api/check-in/verify-pass/route.ts` — check-in réel, bien réaligné
- `app/admin/reservations/[id]/page.tsx` — actions admin désactivées, aucune route serveur
- `app/parent/approvals/page.tsx` — mapping `action_type` incomplet (`event_booking` absent) + drift `full_name`
- `components/reservation-form.tsx` — code mort/orphelin, schéma legacy

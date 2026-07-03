# Audit — Onboarding Parent

*Date : 2026-07-03 — branche `refonte/home-nav-lifestyle` — post V11 (#291-313) + qr-onboarding (5 commits `dd7cb0f`..`a5662f4`).*
*Méthode : lecture directe fichier:ligne, pas de re-découverte des items déjà fermés par `docs/audits/audit-2026-06-03/AUDIT-INSCRIPTION-QUESTIONNAIRE.md` (magic-link, QR sens du flux, bornes d'âge, tables fantômes, CSRF, `handle_new_user` versionné — tous vérifiés RÉSOLUS ci-dessous).*

## Routes inspectées

- `app/onboarding/page.tsx`, `components/onboarding/{welcome,profile-type,parent-setup,teen-setup,features,showcase,completion}-step.tsx`, `onboarding-transition.tsx`, `gamification/*`
- `lib/hooks/use-onboarding.ts`, `lib/hooks/onboarding/{utils,reducer}.ts`
- `app/auth/{sign-up,redirect,validate-teen,validate-teen/start}`
- `app/onboarding/parent/{page,e-signature/page,complete-button}.tsx`
- `app/parent/{page,teens/page,teens/add/page,teens/invite/page,scan-teen/page,settings/page,approvals/page}.tsx`
- `app/guide-parents/page.tsx`, `app/securite/page.tsx` (non lu en détail — hors chemin critique), `app/autorisations/*` (sunset → redirect), `app/carte-vip/{page,souscrire}`
- `gamification-system/features/onboarding/{actions,schema}.ts`
- `app/api/parent/e-signature/create/route.ts`, `app/api/parent/link-teen/scan/route.ts`, `app/api/teen/{link-parent,parent-link-qr}/route.ts`, `app/api/auth/{register-teen,validate-teen}/route.ts`
- `components/e-signature-form.tsx`, `components/parent/e-signature-client.tsx`, `proxy.ts` (gate `is_onboarded`)

## État actuel (résumé 5 lignes)

Le funnel ado→QR/WhatsApp/lien→parent est **réellement câblé** (V11 #297-301 + qr-onboarding) : le teen partage un lien de validation réel, un nouveau parent qui clique dessus est routé via cookie httpOnly `nivy_pending_teen` vers signup/login puis **forcé** par le middleware (`proxy.ts:249-315`) à passer par KYC (CIN) + signature électronique loi 09-08/CNDP (consentement géoloc inclus, opt-in) avant `/parent`, et revient ensuite terminer la validation du teen — c'est un des parcours les mieux câblés de l'app. En revanche, **le wizard pré-compte `/onboarding` (6 étapes marketing) est un mort-vivant pour le profil parent** : `ParentSetupStep` (parent-setup) fait un hard `router.push('/auth/sign-up')` sans jamais appeler `onNext`, donc `features` et `completion` (branches "parent") ainsi que toute la sidebar gamification (missions/XP/badges) **ne sont jamais atteints** par un parent réel — seul le chemin ado les traverse jusqu'au bout. La synchronisation XP pré-compte (`syncOnboardingToUser`/`syncGamificationToUser`) existe côté backend mais **n'est appelée nulle part** dans le code — 100% dette morte, pour ado ET parent. Le dashboard `/parent` et `/parent/settings` sont branchés sur données réelles (Supabase), le lien VIP (`/carte-vip/souscrire`) et les autorisations (`/parent/approvals`) sont cohérents et non dupliqués (`/autorisations` sunset proprement). `guide-parents` reste un contenu marketing statique sans lien d'entrée vers le vrai flow.

## Niveau "pro" (1-5) avec justification

**3/5**

- Le chemin critique (ado inscrit → parent KYC+signature → liaison → dashboard réel) est du niveau 4 : gate serveur robuste, cookie sécurisé, consentement géoloc explicite, données réelles au dashboard.
- Le wizard marketing `/onboarding` retombe à 2/5 : 3 des 6 étapes composant l'« expérience gamifiée parent » vendue par le code (XP sidebar, missions preview, reward popup, features showcase, completion célébration) sont **inaccessibles en pratique** pour un parent — la promesse UX du fichier ne correspond pas au parcours réel emprunté.
- Pas de P0 bloquant fonctionnel restant sur le chemin critique (ceux de l'audit du 06-03 sont vérifiés fermés). Les gaps restants sont des dettes de cohérence/contenu mort, pas des ruptures d'accès.

## Données : statique/mocké vs API réelle

| Étape | UI | Persistance Supabase | Réel/Mock |
| ----- | -- | --------------------- | --------- |
| Wizard `/onboarding` (welcome→profile-type) | `app/onboarding/page.tsx:284-299` | Aucune (localStorage `STORAGE_KEY`, TTL 24h) | Réel pour le pré-compte, mais éphémère |
| `parent-setup` (hand-off) | `components/onboarding/parent-setup-step.tsx:73-77` | Aucune — hard nav vers `/auth/sign-up` | Réel (pas de mock), mais **jamais de retour dans le wizard** |
| `/auth/sign-up` (compte réel) | `app/auth/sign-up/page.tsx` | `auth.signUp` + `handle_new_user` trigger | Réel |
| KYC + signature (`/onboarding/parent/e-signature`) | `components/e-signature-form.tsx`, `components/parent/e-signature-client.tsx` | `e_signatures` (CIN front/back, hash, `location_consent`) via `/api/parent/e-signature/create` | **Réel** — plus un dead-end |
| Finalisation (`/onboarding/parent/page.tsx:30-56`) | Lecture `profiles.is_onboarded`, `e_signatures.terms_accepted` | Réel (gate serveur) | Réel |
| Ado partage QR/lien (`teen-setup-step.tsx:100-109,457-515`) | `qrcode.toDataURL`, WhatsApp `wa.me`, Web Share API | `pending_teen_registrations` via `/api/auth/register-teen` | Réel |
| Nouveau parent clique le lien (`/auth/validate-teen/start`) | Cookie httpOnly `nivy_pending_teen` | — | Réel |
| Retour post-KYC → validation teen (`/auth/redirect:53-59`) | Lecture cookie + `is_onboarded` | Cascade `validate-teen` : `createUser`+`teens`+`parent_teen_links` | Réel |
| Parent scanne le QR du teen (`/parent/scan-teen`) | `components/parent/scan-teen-client.tsx` | `/api/parent/link-teen/scan` → `teen_link_tokens` | Réel |
| Dashboard `/parent` (budget, approvals, evolution) | `app/parent/page.tsx:32-240` | `parent_teens_overview`, `teen_budget_limits`, `bookings`, `parental_approvals`, `feed_posts`, `quiz_attempts` | Réel (aucun hardcode résiduel observé) |
| `/parent/settings` (tier, teens count) | `app/parent/settings/page.tsx:28-30` | `getUserRole()` → `parent_subscription_view` | Réel |
| VIP card lien (`/carte-vip/souscrire`) | `app/parent/settings/page.tsx:92` | — (page marketing séparée, cf. `carte-vip/page.tsx:4-8` distingue explicitement des 2 nomenclatures VIP) | Réel lien, page à part |
| `features`/`completion` branche parent (wizard) | `components/onboarding/features-step.tsx`, `completion-step.tsx:159-167` | `recordStepCompletion`/`STEP_XP_REWARDS` (RPC réel) | **Mort** — jamais rendu pour un parent réel |
| Gamification sidebar (`OnboardingMissionsPreview`, `OnboardingXPDisplay`, reward popup) | `components/onboarding/gamification/*` | RPC `record_onboarding_step` réel côté DB | Réel côté plomberie, **inatteignable** en usage réel parent |
| `syncOnboardingToUser`/`syncGamificationToUser` | `lib/hooks/use-onboarding.ts:127-137` | RPC `sync_onboarding_to_user` (migration 020) | **Callable nulle part** — 0 appelant trouvé dans tout le repo |
| `guide-parents` | `app/guide-parents/page.tsx` | Aucune — contenu 100% statique (FAQ, steps, engagements) | Statique assumé (page marketing), pas de CTA vers `/onboarding` ni `/auth/sign-up` |

## Cohérence avec le reste de l'app

- **Handoff vers `/parent`** : robuste. Le gate `proxy.ts:249-315` force `is_onboarded=false` + `role=parent` vers `/onboarding/parent/e-signature`, empêchant tout accès prématuré au dashboard ou aux fonctionnalités argent — c'est le comportement attendu d'un produit pro.
- **Lien VIP card** : cohérent, un seul point d'entrée (`/parent/settings` → `/carte-vip/souscrire`), pas de duplication avec le système XP `vip_tiers` (commentaire explicite `carte-vip/page.tsx:4-8`).
- **Lien autorisations** : `/autorisations` et `/autorisations/ajouter` sont proprement sunset (`permanentRedirect` vers `/parent/approvals`), aucune UI orpheline.
- **Guide parents** : cohérent en ton et contenu, mais **déconnecté du funnel réel** — aucun lien direct de `guide-parents` vers `/onboarding` ou `/auth/sign-up`; c'est une page de réassurance pure, pas un compagnon d'onboarding actif.
- **Incohérence interne au wizard** : `completion-step.tsx:87-89` affiche "Votre compte est créé ! Vous pouvez maintenant gérer les activités" pour `userType==='parent'`, message qui **suppose un compte qu'aucun parent n'a créé à cet endroit** (la création réelle se fait après hard-nav vers `/auth/sign-up`, en dehors du wizard). Ce texte est mort mais reste un piège si un futur dev réactive ce chemin sans le lire.

## Gaps bloquants (P0)

Aucun. Les 4 P0 de l'audit du 06-03 (magic-link jeté, QR-vers-parent absent, scanner gated partner, notifications sur tables fantômes) sont vérifiés **résolus** par les commits V11 #291/#296-301 et qr-onboarding `dd7cb0f`/`c3bf9d2`/`0d97472`. Le seul point à surveiller de près (classé P1, pas P0 car sans impact utilisateur constaté) est ci-dessous.

## Gaps importants (P1)

1. **(a) CASSÉ / dette morte — wizard parent inatteignable au-delà de `parent-setup`.** `components/onboarding/parent-setup-step.tsx:59-77` : le bouton "Créer mon compte" appelle `handleContinue` → `router.push(buildSignUpHref(...))`, jamais `_onNext` (explicitement `void _onNext` ligne 63). Résultat : `app/onboarding/page.tsx:301-321` (branches `features`+`completion` pour `userType==='parent'`) et toute la sidebar gamification (`OnboardingMissionsPreview`, XP display, reward popup) sont du code mort pour ce profil — atteignables seulement en dev via manipulation d'état. Effort: **S** (soit retirer les branches parent des steps `features`/`completion`/gamification et documenter le hand-off comme fin de wizard, soit — si on veut restaurer la promesse gamifiée — faire persister l'XP pré-compte jusqu'à `/auth/sign-up?tempUserId=` et le consommer réellement après confirmation d'email).
2. **(d) DETTE — `syncOnboardingToUser`/`syncGamificationToUser` jamais appelés.** `lib/hooks/use-onboarding.ts:127-137` exporte `syncGamificationToUser(teenId)`, RPC réelle `sync_onboarding_to_user` existe (migration 020), mais **aucun composant ne l'invoque** (`grep syncGamificationToUser` = 2 occurrences, la déclaration et l'export). Tout XP/coins/badges gagnés pendant le pré-compte (ado ou parent) reste bloqué en `localStorage`/table temporaire, jamais crédité au compte réel. Effort: **M** (brancher l'appel après confirmation email teen, ou supprimer la fonction + le discours "XP sécurisés" de `parent-setup-step.tsx:108-112`).
3. **(c) MANQUANT vs standard pro — `guide-parents` sans CTA vers le funnel réel.** `app/guide-parents/page.tsx` est un contenu FAQ/marketing complet et à jour, mais ne contient **aucun lien direct** vers `/onboarding`, `/auth/sign-up` ou le CTA d'inscription (uniquement `/aide`, WhatsApp support). Un parent qui atterrit ici en pré-achat n'a pas de chemin direct vers l'inscription depuis cette page. Effort: **S** (ajouter 1-2 CTA "Créer mon compte parent" → `/onboarding?role=parent`).

## Polish (P2)

1. **(b) MOCK/faux contenu résiduel — message de complétion trompeur.** `components/onboarding/completion-step.tsx:87-89` : "Votre compte est créé !" pour `userType==='parent'`, alors que ce chemin n'est jamais atteint (cf. P1-1) — si jamais réactivé, le message serait faux tant que `/auth/sign-up` n'a pas encore tourné. Effort: **S** (à corriger seulement si P1-1 est traité en gardant ce chemin vivant).
2. **(d) DETTE — deux mécanismes de "features step"/"gamification-intro" distincts et jamais visités côté parent** (`components/onboarding/features-step.tsx` + `components/onboarding/gamification/gamification-intro.tsx`) alors que `FeaturesStep` pour teen reste, lui, potentiellement atteint. Pas de bug actif, mais surface de code à maintenir sans bénéfice utilisateur mesurable côté parent. Effort: **S** (documenter ou retirer la branche parent uniquement).
3. **(c) Cohérence mineure — `ParentSetupStep` promet "XP & badges sécurisés... fusionnés automatiquement avec votre compte"** (`parent-setup-step.tsx:108-112`) — promesse non tenue tant que P1-2 n'est pas câblé. Effort: **S** (retirer la mention tant que le sync n'existe pas, ou câbler P1-2 d'abord).

## Effort estimé (S/M/L par gap)

| Gap | Type | Effort |
|---|---|---|
| P1-1 Wizard parent inatteignable au-delà de `parent-setup` | CASSÉ / dette morte | S |
| P1-2 `syncOnboardingToUser` jamais appelé | DETTE | M |
| P1-3 `guide-parents` sans CTA vers le funnel | MANQUANT | S |
| P2-1 Message "compte créé" trompeur si réactivé | MOCK résiduel | S |
| P2-2 `features-step`/`gamification-intro` branche parent morte | DETTE/doublon | S |
| P2-3 Promesse XP non tenue dans `parent-setup-step` | Cohérence | S |

## Fichiers critiques à connaître

- `app/onboarding/page.tsx` — orchestrateur 6 étapes, `buildStepList:51-60`, redirections `handleStepComplete:141-165`
- `components/onboarding/parent-setup-step.tsx:59-77` — le hard-nav qui rend `features`/`completion` inatteignables pour un parent
- `lib/hooks/use-onboarding.ts:127-137,181-196` — `syncGamificationToUser` exporté mais orphelin ; persistance localStorage `STORAGE_KEY`/`GAMIFICATION_KEY` (24h TTL, ligne 61-66)
- `lib/hooks/onboarding/reducer.ts:6-27` (`utils.ts`) — `getNextStep`/`getPreviousStep`, confirme l'ordre linéaire sans étape morte au niveau state machine (le mort vient du composant, pas du reducer)
- `app/auth/redirect/page.tsx:46-61` — seam qr-onboarding : parent onboardé + cookie pending-teen → reprise validation
- `app/auth/validate-teen/start/route.ts` — dépôt cookie httpOnly `nivy_pending_teen`
- `proxy.ts:249-315` — gate serveur `is_onboarded` forçant KYC+signature avant `/parent`
- `app/onboarding/parent/e-signature/page.tsx`, `components/e-signature-form.tsx`, `components/parent/e-signature-client.tsx` — chaîne KYC/signature réellement câblée (plus un dead-end)
- `app/api/parent/e-signature/create/route.ts:125` — écriture `location_consent` (loi 09-08)
- `app/api/parent/live/route.ts:49`, `app/api/parent/rides/[id]/track/route.ts:41` — gate lecture géoloc sur consentement signé
- `components/onboarding/teen-setup-step.tsx:53-109,457-515` — étape héro "fais valider" (QR + WhatsApp + Web Share + copie)
- `app/parent/page.tsx:22-240` — dashboard 100% données réelles (aucun hardcode résiduel observé)
- `app/parent/scan-teen/page.tsx`, `app/api/parent/link-teen/scan/route.ts` — scanner parent réel (V11 #298)
- `app/autorisations/page.tsx`, `app/autorisations/ajouter/page.tsx` — sunset propre vers `/parent/approvals`
- `app/guide-parents/page.tsx` — contenu réel mais sans CTA vers le funnel d'inscription
- `gamification-system/features/onboarding/actions.ts:198-243` — `syncOnboardingToUser`, RPC réelle jamais invoquée par aucun composant

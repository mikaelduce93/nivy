# Diagnostic — Crash connexion & Responsivité mobile (Nivy)

## Résumé exécutif

- **Aucun crash « Rendered more hooks than during the previous render » n'existe réellement.** Les cinq trouvailles initialement étiquetées `crash` ont toutes été réfutées sur ce point précis après lecture du code : dans chaque composant, tous les hooks sont appelés inconditionnellement avant le premier `return`, donc le nombre de hooks ne varie jamais entre deux rendus.
- **Deux vrais défauts « build-time / page blanche » subsistent**, de classe Next.js App Router et non « hooks » : `useSearchParams()` sans `<Suspense>` sur `app/carte-vip/confirmation/page.tsx` (post-paiement VIP) et `app/auth/validate-teen/page.tsx` (activation du compte ado). Ce sont les seuls candidats sérieux à un échec de prérendu / page blanche.
- **La cause racine la plus probable du symptôme « il faut rafraîchir pour que la connexion fonctionne »** est `components/navbar.tsx` : la navbar lit l'auth une seule fois (`getUser()` au montage, sans `onAuthStateChange`) et persiste dans le root layout, donc l'UI globale reste figée sur l'état déconnecté tant qu'on ne recharge pas. C'est de l'UX/cohérence, pas un crash.
- **Responsivité — zones les plus touchées (vérifiées) :** espace **Partner** (cul-de-sac total de navigation sur mobile : drawer vide + sidebar `hidden md:flex`) et espace **Admin** (sidebar `w-64` fixe non masquée + `pl-64` non responsive sur le `<main>`). Bien que sévères, ces deux zones sont du back-office (staff/partenaires), pas le cœur de cible ado.
- **Zone Teen (cœur de cible) :** deux défauts responsive vérifiés et certains — stats profil en `grid-cols-4` fixe (débordement des coins) et barre « Commander » `sticky bottom-0` passant sous le dock — plus le défaut navbar et un remontage bénin du dashboard.
- **Le reste (medium/low) est non vérifié** : essentiellement des titres `text-5xl` sans base mobile, des grilles à colonnes fixes, des paddings verticaux excessifs et quelques drawers de nav vides (Ambassadeur/Mentor). À traiter en lot, faible risque.

## 1. Crash « Rendered more hooks » à la connexion

**Verdict : ce crash n'est pas reproductible dans le code audité.** Les cinq composants soupçonnés ont été lus intégralement ; dans chacun, l'ordre et le nombre de hooks sont stables entre rendus (tous les hooks précèdent le premier `return`, aucun hook conditionnel, aucun early-return avant un hook). L'erreur React « Rendered more hooks than during the previous render » exige un nombre de hooks variable au sein d'une même instance — condition absente partout ici.

Ce qui a probablement été pris pour ce crash est en réalité **deux défauts Next.js App Router distincts** (échec de prérendu / page forcée en CSR avec page blanche), à corriger en priorité car ils touchent des flux critiques :

### Cause la plus probable d'une page blanche au chargement — `useSearchParams()` sans `<Suspense>`

1. **`app/carte-vip/confirmation/page.tsx:20-22`** (flux retour de paiement VIP). Le composant page `"use client"` appelle `useSearchParams()` (l.21) puis `.get('session_id')` (l.22) sans aucune frontière `<Suspense>` (absente du fichier, du dossier `app/carte-vip/` et du root layout). Mécanisme réel : bailout de prérendu Next 16 `missing-suspense-with-csr-bailout` au build (pas un crash de hooks). **Correctif exact :**
   - l.3 : `import { useEffect, useState, Suspense } from "react"`
   - l.20 : renommer `export default function PassConfirmationPage()` → `function PassConfirmationInner()`
   - après la `}` finale (l.201), ajouter un wrapper exporté :
     ```tsx
     export default function PassConfirmationPage() {
       return (
         <Suspense fallback={null}>
           <PassConfirmationInner />
         </Suspense>
       )
     }
     ```
   C'est le pattern déjà utilisé dans `app/auth/sign-up/page.tsx:284-291` et `app/partenaires/merci/page.tsx:208-214`.

2. **`app/auth/validate-teen/page.tsx:24-27`** (lien email parent → activation du compte ado). Même classe : `useSearchParams()` (l.26) puis `.get('token')` (l.27) sans `<Suspense>` (l.3 n'importe pas `Suspense`, pas de `app/auth/layout.tsx`). **Correctif exact :**
   - l.3 : `import { useEffect, useState, Suspense } from "react"`
   - l.24 : `export default function ValidateTeenPage()` → `function ValidateTeenInner()`
   - en fin de fichier (après l.295) : `export default function ValidateTeenPage() { return (<Suspense fallback={null}><ValidateTeenInner /></Suspense>) }`

### Candidats secondaires (réfutés comme « crash », conservés pour info)

- `components/navbar.tsx:62-78` — défaut d'auth périmé réel mais **UX, pas crash** (voir §2).
- `proxy.ts:172-264` — double `getUser()` + footgun cookies : **perf/SSR de basse sévérité**, aucun hook React (middleware serveur).
- `components/teen/dashboard/teen-dashboard-content.tsx:42-93` — remontage de sous-arbre dû au wrapper `<PullToRefresh>` conditionné par `mounted` : **flash + double fetch bénin**, pas un crash (voir §3 Teen).
- `components/agenda/events-client.tsx:375,408` — risque de mismatch d'hydratation (fuseau / `isNew`) : **warning console**, pas un crash (voir §3 Composants partagés).

## 2. Bug « il faut rafraîchir pour se connecter »

**Cause racine (distincte du §1) — `components/navbar.tsx:62-78`.** La navbar lit l'état d'auth une seule fois au montage : `useEffect(() => { checkUser() }, [])` appelle `supabase.auth.getUser()` puis `setUser(user)`, sans jamais s'abonner via `supabase.auth.onAuthStateChange(...)`. Or la navbar est rendue dans le root layout persistant (`app/layout.tsx:251-258`, desktop + mobile) et le flux de login est en soft-navigation (`app/auth/login/page.tsx:62` `router.push` → `app/auth/redirect/page.tsx` server `redirect()`), donc la navbar ne se re-monte pas et `user` reste `null`. Conséquences figées : `href: user ? "/espace" : "/auth/login"` (l.254), megaMenu « Se connecter/S'inscrire » (l.255-281), CTA desktop (l.436-451) et mobile (l.527-537). C'est de l'UX/cohérence (sévérité **high**), pas un crash.

**Correctif exact** — s'abonner après le `getUser` initial, en gardant le mock client (qui n'expose pas `onAuthStateChange`, cf. `lib/supabase/client.ts:9-23`). Pattern déjà appliqué dans `components/monitoring/sentry-user-context.tsx:60-74`. Remplacer le corps du `useEffect` (l.62-78) par :

```tsx
useEffect(() => {
  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.warn("[v0] Auth check failed:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }
  checkUser()

  if (typeof supabase.auth.onAuthStateChange === "function") {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription?.unsubscribe()
  }
}, [])
```

Ne pas introduire de return anticipé (préserver l'ordre inconditionnel des hooks). Ce seul changement corrige aussi le href « Mon Espace » et les CTA desktop/mobile.

**Race secondaire (basse sévérité) — `proxy.ts:172-264`.** `updateSession` (`lib/supabase/middleware.ts:34-36`) appelle déjà `getUser()`, puis `proxy.ts` reconstruit un `createServerClient` (l.244-253) et refait `getUser()` (l.255-257) + lecture `profiles` (l.282-286) : double aller-retour auth distant par navigation protégée → TTFB accru sur mobile, amplifie la fenêtre de race au login. De plus le `setAll` du 2e client (l.249-251) et du client admin (l.196-198) n'écrit que `request.cookies`, jamais `response.cookies` → un refresh de token déclenché ici ne reviendrait pas au navigateur. **Correctif :** corriger `setAll` pour écrire sur `request.cookies` ET `response.cookies`, n'appeler `getUser()` qu'une fois et réutiliser `user` + `profiles`, idéalement faire retourner `{ response, user }` par `updateSession`.

## 3. Responsivité mobile — par zone

### Teen (cœur de cible)

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `app/teen/profile/profile-hub-client.tsx:118` | high | 4 cartes stats en `grid-cols-4` fixe → coins (`12 500`) débordent sous 430px | `grid grid-cols-2 sm:grid-cols-4 gap-4` (pattern déjà utilisé l.213) |
| `app/teen/food/[partner_id]/menu-cart-client.tsx:384` | medium | Barre « Commander » `sticky bottom-0` passe sous le dock mobile (`fixed bottom-0 z-50`) | `sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-0 ...` (6rem aligné sur `app/teen/layout.tsx:67`) |
| `components/teen/dashboard/teen-dashboard-content.tsx:87-93` | low | Forme d'arbre change (`<PullToRefresh>` conditionné par `mounted`) → remontage + double fetch | Toujours monter : `return (<PullToRefresh onRefresh={handleRefresh} disabled={!mobile}>{content}</PullToRefresh>)` |
| `app/teen/vip-card/vip-card-client.tsx:103` | medium *(non vérifié)* | Titre palier `text-5xl uppercase` non responsive (« LÉGENDAIRE » déborde) | `text-3xl sm:text-5xl` + `break-words` ; `p-6 sm:p-8` sur la DarkSurface |
| `components/circles/circle-chat.tsx:712` | medium *(non vérifié)* | `h-full` dans `<main>` sans hauteur fixe → input non collé, zone messages non bornée | `h-[calc(100dvh-4rem-5rem)]` au lieu de `h-full` (dvh, pas vh) |
| `app/teen/food/[partner_id]/menu-cart-client.tsx:291,306` | medium *(non vérifié)* | Boutons +/- panier à 36px (`h-9 w-9`) < cible tactile 44px | `h-11 w-11` |
| `app/teen/defis-physiques/defis-physiques-client.tsx:154-176` | low *(non vérifié)* | Stats `grid-cols-3` fixe → gros XP déborde (idem games/streak/circles) | `grid-cols-2 sm:grid-cols-3` et/ou `text-xl sm:text-2xl` |
| `app/teen/friends/friends-client.tsx:355` | low *(non vérifié)* | Onglets `flex gap-2` sans overflow ni wrap | `flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden` |
| `app/teen/academic/academic-client.tsx:248-260` | low *(non vérifié)* | Header titre + bouton sans wrap (code mort : redirect vers /teen/aide-scolaire) | `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` (sinon marquer dead code) |

### Parent

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `app/parent/grades/page.tsx:354-367` | medium *(non vérifié)* | 3 stickers en `grid-cols-3` fixe écrasés à 360px | `grid grid-cols-1 gap-3 sm:grid-cols-3` |
| `app/parent/grades/page.tsx:381-395` | medium *(non vérifié)* | 4 boutons filtre `flex gap-2` non-wrap débordent | `flex flex-wrap gap-2` |
| `app/parent/page.tsx:252-254` | medium *(non vérifié)* | H1 « Centre de contrôle » `text-5xl` sans base mobile (conteneur overflow-x-hidden) | `text-3xl sm:text-4xl md:text-6xl` |
| `components/parent/dashboard/financial-overview.tsx:53-55` | low *(non vérifié)* | Montant `text-5xl` frôle le bord à 360px | `text-4xl sm:text-5xl` ; suffixe `text-lg sm:text-xl` |
| `app/parent/history/page.tsx:337-382` | low *(non vérifié)* | Lignes transaction `flex justify-between` sans wrap/truncate | `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` + `min-w-0`/`truncate` sur la description |

### Partner

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `components/dashboard/partner/header.tsx:54-68` | critical | **Cul-de-sac mobile** : drawer mobile vide (titre seul) + sidebar `hidden md:flex`, aucun MobileDock → aucune page atteignable | Remplir le `SheetContent` avec la nav (réutiliser `buildActiveNav`/`PENDING_NAV` de `sidebar.tsx`) ; Sheet contrôlé + `onClick={() => setOpen(false)}` sur chaque `<Link>` ; passer `partnerType`/`partnerStatus` depuis `app/partner/layout.tsx:41` |
| `components/partners/RetailPartnerForm.tsx:261-285` | medium *(non vérifié)* | 4 libellés d'étapes complets compressés dans `flex justify-between` à 360px | Libellés `hidden sm:block` + titre étape courante `sm:hidden` ; pastilles `size-9 sm:size-12` |
| `components/partners/VenuePartnerForm.tsx:286-309` | medium *(non vérifié)* | Idem (dupliqué Club/Education) | Même correctif ; idéalement extraire un `<WizardSteps>` partagé |
| `components/partner/dashboard/feeds.tsx:45-54` | medium *(non vérifié)* | `p-8` (64px horizontal) étrangle le contenu à 360px ; nom client non tronqué écrase le montant | `p-5 sm:p-8` / `px-5 sm:px-8` / lignes `p-4 sm:p-6` + `min-w-0`+`truncate` sur le nom |
| `app/partner/events/page.tsx:220-266` | medium *(non vérifié)* | Header carte `flex justify-between` sans wrap (titre vs colonne boutons) | Wrapper `flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between` ; actions `flex-row sm:flex-col sm:items-end` ; `min-w-0` sur le titre |

### Ambassadeur / Mentor

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `app/ambassador/layout.tsx:32-41` | medium *(non vérifié)* | Sidebar `hidden md:flex` + drawer hamburger vide (le MobileDock couvre la nav, mais le tiroir est creux) | Retirer le hamburger OU remplir le `SheetContent` avec les liens de la sidebar |
| `components/dashboard/mentor/sidebar.tsx:24` | medium *(non vérifié)* | Sidebar `hidden md:flex`, header sans hamburger, MobileDock retombe sur `publicNavItems` pour `/mentor/*` | Ajouter `isMentorArea` + `mentorNavItems` au MobileDock OU hamburger + Sheet de nav dans `MentorHeader` |
| `app/ambassador/page.tsx:103` | low *(non vérifié)* | `py-32` (128px) excessif sur mobile (idem marketing/withdrawals/referrals/commissions/comment-gagner) | `py-20 md:py-32` |
| `app/ambassador/marketing/page.tsx:103` | low *(non vérifié)* | `min-h-screen` imbriqué dans un main déjà plein hauteur → vide en bas (idem withdrawals/referrals/commissions) | Retirer `min-h-screen` des pages enfant |
| `app/mentor/dashboard/page.tsx:130` | low *(non vérifié)* | Full-bleed par marges négatives `-m-4 md:-m-8 lg:-m-10` couplé au padding du layout (fragile ; idem sessions:49, profile/edit:37) | Layout sans padding pour ces routes, ou garder marge/padding strictement appariés |

### Admin

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `components/layouts/admin-sidebar.tsx:101-105` | high | Sidebar `w-64` fixe **jamais masquée** sous md → recouvre ~70% de l'écran à 360px, aucun drawer | Ajouter `hidden md:block` ; préfixer largeurs `md:w-16`/`md:w-64` |
| `app/admin/layout.tsx:38-42` | high | `pl-64` inconditionnel sur le `<main>` → contenu démarre à 256px du bord sur mobile (~104px utiles) | `pl-64` → `pl-0 md:pl-64` (à coupler au masquage de la sidebar ci-dessus) |
| `app/admin/permissions/page.tsx:133` | low *(non vérifié)* | `py-32` excessif sur mobile (idem scripts-sql:92, check-in:45, gamification/scorecard:60, gamification-setup:103) | `px-6 py-12 md:py-32` |

### Public

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `app/devenir-partenaire/page.tsx:71` | medium *(non vérifié)* | H1 « Devenez Partenaire » `text-5xl` sans base mobile (risque débordement « Partenaire ») | `text-4xl sm:text-5xl md:text-7xl` |
| `app/devenir-ambassadeur/page.tsx:65` | medium *(non vérifié)* | H1 « Programme Ambassadeurs » `text-5xl` sans base mobile | `text-4xl sm:text-5xl md:text-7xl` + `break-words` |
| `app/devenir-ambassadeur/programme/page.tsx:18` | medium *(non vérifié)* | Même H1 `text-5xl` sans base mobile | `text-4xl sm:text-5xl md:text-7xl` |
| `app/devenir-ambassadeur/programme/page.tsx:16-21` | low *(non vérifié)* | Halo `absolute -inset-2` dans wrapper `inline-block` non positionné → halo décalé | `relative inline-block mb-6` sur le wrapper du titre |
| `app/devenir-partenaire/page.tsx:69-80` | low *(non vérifié)* | Hero `py-24` + `text-5xl` + `text-xl` lourds sur mobile | `py-14 sm:py-24` ; `text-4xl sm:text-5xl md:text-7xl` ; `text-lg sm:text-xl` |
| `app/page.tsx:286-296` | low *(non vérifié)* | PhoneMockup 312px + halo `-inset-8` sans clip → scroll horizontal parasite à 360px | `overflow-hidden` sur la section/wrapper, ou réduire la largeur du mockup en mobile |
| `app/page.tsx:319,342` | low *(non vérifié)* | Montants « deux monnaies » `text-[54px]` fixe sans variante mobile | `text-[clamp(2.25rem,9vw,54px)]` (ou `text-4xl sm:text-[54px]`) |

### Composants partagés

| Fichier:ligne | Sévérité | Problème | Correctif (classes) |
|---|---|---|---|
| `components/parent/add-teen-form.tsx:712-727` | high | Sélecteur avatar `grid-cols-8` + boutons `h-10 w-10` figés (376px) déborde sous ~208px dispo à 360px | Cellules fluides l.718 : `aspect-square w-full` (au lieu de `h-10 w-10`) ; grille l.712 : `grid grid-cols-6 gap-2 sm:grid-cols-8` |
| `components/cookie-banner.tsx:32` | medium | Bandeau `fixed bottom-0 z-50` recouvre le dock mobile (1re visite, transitoire) | `pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]` |
| `components/ui/carousel.tsx:189-191, 219-221` | medium *(non vérifié)* | Flèches `-left-12`/`-right-12` hors écran sur mobile (invisibles ou scroll parasite) | `left-2 sm:-left-12` / `right-2 sm:-right-12` (ou `hidden sm:flex`) + `overflow-hidden` sur le conteneur |
| `components/notifications/notification-center.tsx:202-205` | medium *(non vérifié)* | Popover notifications `w-[380px]` > 360px → collé aux bords / rogné | `w-[calc(100vw-1.5rem)] max-w-[380px] p-0` |
| `components/agenda/events-client.tsx:375,408` | low | Mismatch d'hydratation : `toLocaleTimeString`/`toLocaleDateString` sans timeZone (+ l.399,470,471) et `isNew` lu à l'horloge du render (l.375,442) | Ajouter `timeZone: "Africa/Casablanca"` aux formats ; calculer `isNew` côté serveur (`app/agenda/page.tsx`) ou via `useState`/`useEffect` post-mount |
| `components/ui/primitives/grid.tsx:59` | low *(non vérifié)* | Preset `bento` = `grid-cols-4` dès le mobile (~80px/colonne à 360px) | `grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-12` |

## 4. Plan d'action priorisé

### P0 — Stabilité (build-time / page blanche + connexion)

1. `app/carte-vip/confirmation/page.tsx:20-22` → extraire `PassConfirmationInner` + wrapper `<Suspense>` (import `Suspense` l.3). Débloque le flux retour de paiement VIP.
2. `app/auth/validate-teen/page.tsx:24-27` → extraire `ValidateTeenInner` + wrapper `<Suspense>` (import `Suspense` l.3). Débloque l'activation parent → ado.
3. `components/navbar.tsx:62-78` → ajouter l'abonnement `onAuthStateChange` (avec garde mock client) pour que l'UI globale reflète la connexion sans reload. **Corrige directement le symptôme « il faut rafraîchir ».**

### P1 — Responsive critique mobile (priorité zone Teen, puis back-office)

1. `app/teen/profile/profile-hub-client.tsx:118` → `grid grid-cols-2 sm:grid-cols-4 gap-4`.
2. `app/teen/food/[partner_id]/menu-cart-client.tsx:384` → `sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-0`.
3. `components/parent/add-teen-form.tsx:712,718` → cellules `aspect-square w-full` + grille `grid-cols-6 sm:grid-cols-8` (sinon création de compte teen quasi inutilisable sous 375px).
4. `components/dashboard/partner/header.tsx:54-68` (+ `app/partner/layout.tsx:41`, exports dans `sidebar.tsx`) → remplir le drawer mobile avec la nav (Sheet contrôlé + fermeture au clic). Lève le cul-de-sac partenaire mobile.
5. `components/layouts/admin-sidebar.tsx:101-105` + `app/admin/layout.tsx:41` → `hidden md:block` sur l'aside et `pl-0 md:pl-64` sur le `<main>` (les deux ensemble, sinon le contenu passe sous la sidebar).
6. `components/cookie-banner.tsx:32` → `pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]`.

### P2 — Responsive medium/low + nettoyages (en lot, faible risque, *non vérifiés sauf mention*)

- **Teen :** `teen-dashboard-content.tsx:87-93` (toujours monter `<PullToRefresh disabled={!mobile}>`, vérifié) ; `vip-card-client.tsx:103` ; `circle-chat.tsx:712` ; `menu-cart-client.tsx:291,306` (boutons `h-11 w-11`) ; `defis-physiques-client.tsx:154-176` (+ games/streak/circles) ; `friends-client.tsx:355` ; `academic-client.tsx:248-260` (dead code).
- **Parent :** `grades/page.tsx:354-367` et `:381-395` ; `page.tsx:252-254` ; `financial-overview.tsx:53-55` ; `history/page.tsx:337-382`.
- **Partner :** wizards `RetailPartnerForm.tsx:261-285` / `VenuePartnerForm.tsx:286-309` (+ Club/Education, extraire `<WizardSteps>`) ; `feeds.tsx:45-54` ; `events/page.tsx:220-266`.
- **Ambassadeur/Mentor :** `ambassador/layout.tsx:32-41` (drawer vide) ; `mentor/sidebar.tsx:24` (+ branche MobileDock) ; paddings `py-32` et `min-h-screen` imbriqués ; full-bleed par marges négatives `mentor/dashboard/page.tsx:130`.
- **Admin :** `permissions/page.tsx:133` et autres `py-32` (`scripts-sql:92`, `check-in:45`, `gamification/scorecard:60`, `gamification-setup:103`).
- **Public :** titres hero `text-5xl` → base mobile réduite (`devenir-partenaire/page.tsx:71`, `devenir-ambassadeur/page.tsx:65`, `programme/page.tsx:18`) ; halo `inline-block` → `relative inline-block` ; `page.tsx:286-296` clip + `page.tsx:319,342` taille fluide.
- **Composants partagés :** `carousel.tsx:189-191,219-221` (flèches dans l'écran) ; `notification-center.tsx:202-205` (largeur plafonnée) ; `events-client.tsx:375,408` (timeZone + `isNew` serveur, vérifié low) ; `primitives/grid.tsx:59` (preset `bento`).
- **Perf/SSR (hors responsive) :** `proxy.ts:172-264` → dédupliquer `getUser()` et corriger `setAll` (écrire sur `response.cookies`).
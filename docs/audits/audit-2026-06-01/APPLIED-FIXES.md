# Correctifs appliqués — Crash connexion & Responsivité mobile

Date : 2026-06-01 · Branche : `milestone/v4-best-seller` · **Rien n'a été committé** (laissé au PO).
Vérification globale : `tsc --noEmit` **0 erreur** sur tous les fichiers touchés · `eslint` **0 erreur** (warnings = baseline préexistant).

Voir le diagnostic complet : [`DIAGNOSTIC-CRASH-RESPONSIVE.md`](./DIAGNOSTIC-CRASH-RESPONSIVE.md).
Données brutes : [`DIAGNOSTIC-RAW.json`](./DIAGNOSTIC-RAW.json) · P2 vérifiées : [`P2-findings.json`](./P2-findings.json) / [`P2-confirmed-fixes.txt`](./P2-confirmed-fixes.txt).

---

## P0 — Stabilité (les deux symptômes signalés)

| Fichier | Correctif |
|---|---|
| `app/auth/validate-teen/page.tsx` | `useSearchParams()` enveloppé dans `<Suspense>` (extraction `ValidateTeenInner`) — flux activation compte ado |
| `app/carte-vip/confirmation/page.tsx` | idem (`PassConfirmationInner`) — flux retour paiement VIP |
| `components/navbar.tsx` | abonnement `supabase.auth.onAuthStateChange` (garde mock client) → l'UI reflète la connexion **sans refresh** |

> **Verdict crash** : aucun hook conditionnel n'existe (réfuté par 38 agents). L'erreur « Rendered more hooks » vue en dev = résidu de **chunks périmés du service worker** (tag « (stale) » + stack 100 % interne à Next). Le SW se désinscrit déjà en dev ; le navigateur doit être nettoyé **une fois** (DevTools → Application → Service Workers → Unregister + Clear site data → Ctrl+Shift+R).

## P1 — Responsive vérifié (Teen prioritaire + back-office critique)

| Fichier | Correctif |
|---|---|
| `app/teen/profile/profile-hub-client.tsx` | stats `grid-cols-4` → `grid-cols-2 sm:grid-cols-4` |
| `app/teen/food/[partner_id]/menu-cart-client.tsx` | barre « Commander » remontée au-dessus du dock mobile |
| `components/parent/add-teen-form.tsx` | grille avatars `grid-cols-8` → `grid-cols-6 sm:grid-cols-8` |
| `components/cookie-banner.tsx` | n'écrase plus le dock (padding bas mobile) |
| `components/layouts/admin-sidebar.tsx` + `app/admin/layout.tsx` | sidebar `hidden md:block` + `pl-0 md:pl-64` |
| `components/dashboard/partner/{header,sidebar}.tsx` + `app/partner/layout.tsx` | **drawer mobile partenaire rempli avec la nav** (fin du cul-de-sac) |

## P2 — Responsive medium/low : 33 trouvailles → vérifiées → 25 confirmées, 8 réfutées

### Appliquées (24)
Teen : `vip-card-client` (titre palier `text-3xl sm:text-5xl`), `circle-chat` (hauteur `dvh`), `menu-cart-client` (boutons ± `h-11 w-11`), `defis-physiques-client` (XP `text-xl sm:text-2xl`).
Parent : `grades/page` (grille stats + filtres `flex-wrap`), `page` (H1 `text-3xl sm:text-4xl md:text-6xl`), `financial-overview` (montant `text-4xl sm:text-5xl`), `history/page` (ligne `flex-col sm:flex-row`).
Partner : `RetailPartnerForm` + `VenuePartnerForm` (wizard : indicateur d'étape mobile + pastilles `w-9 sm:w-12` + libellés `hidden sm:block`), `feeds` (`p-4 sm:p-6 gap-3`), `events/page` (header `flex-col sm:flex-row`).
Public : `devenir-partenaire`, `devenir-ambassadeur`, `devenir-ambassadeur/programme` (H1 `text-4xl sm:…`), `page.tsx` (PhoneMockup `overflow-hidden` + montants `text-[clamp(…)]`).
Ambassadeur/Admin : `ambassador/page` + `ambassador/marketing` (`py-20 md:py-32`, retrait `min-h-screen` imbriqué), `admin/permissions` (`py-12 md:py-32`).

### Réfutées (8 — non appliquées, à juste titre)
- **Code mort** (jamais rendu) : `components/ui/carousel.tsx`, `components/notifications/notification-center.tsx`, `components/ui/primitives/grid.tsx` (preset `bento`), `app/teen/academic/academic-client.tsx` (page = redirect).
- **Faux positifs** : `app/teen/friends/friends-client.tsx` (3 onglets courts, pas de débordement), `app/devenir-ambassadeur/programme` halo (cosmétique, hors viewport), `app/ambassador/layout.tsx` (sidebar correcte, MobileDock couvre), `app/mentor/dashboard/page.tsx` (marges/padding appariés).

### Laissée de côté (1 — à traiter séparément)
- `components/dashboard/mentor/sidebar.tsx` — le correctif proposé transforme la sidebar verticale en barre du bas **sans adapter ses enfants** (risque de casse). À refaire proprement : soit ajouter les liens mentor au `MobileDock`, soit un hamburger + `Sheet` (comme le header partenaire). Sévérité medium, zone back-office mentor.

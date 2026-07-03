# Audit — Homepage

## Routes inspectées
- `app/page.tsx` (homepage, client component)
- `components/trust-banner.tsx`
- `components/brand/` (`index.ts`, `niv.tsx`, `niv-usage.tsx`, `panda-logo.tsx`, `mascot-states.tsx`, `orbiting-tokens.tsx`)
- `components/ui/glass-card.tsx`, `components/ui/neon-button.tsx` — **n'existent plus** (déjà supprimés, cf. V2 charte)
- `app/a-propos/page.tsx`
- `app/temoignages/page.tsx`
- `app/parents/page.tsx`, `app/partenaires/page.tsx` (créés en V10, hors périmètre initial mais adjacents et cités par la home)
- `app/layout.tsx`
- `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`
- `lib/i18n/` (`types.ts`, `dictionaries.ts`, `provider.tsx`)
- `components/navbar.tsx`, `components/footer.tsx` (nécessaires pour vérifier le maillage réel)
- `components/kit/phone-mockup.tsx`, `components/kit/marquee.tsx`
- `components/features/home/home-events-section.tsx` (fichier mort trouvé pendant l'audit)
- `lib/config/app-config.ts` (`getEscrowConfig`, `getPublicAppConfig`)

## État actuel (résumé 5 lignes)
La home a été refaite en V10 (branche `refonte/home-nav-lifestyle`) : c'est aujourd'hui une vraie landing ado-first avec preuve produit (téléphones factices Ado/Parent), agenda live câblé sur Supabase (`events` réel + skeleton + empty state honnête), et un discours de conformité légal cohérent (`getEscrowConfig()` source unique). Les mocks grossiers de l'ancien audit (countdown, `previewUser`, `previewStats`, "10 000 parents") ont disparu — bon signal de remédiation. Le problème n'est plus le contenu de la home elle-même, mais son **maillage** : `/parents` et `/partenaires` (créées en V10) sont des impasses accessibles uniquement depuis la home (aucun lien navbar/footer/sitemap), et `/temoignages` est une page 100% orpheline (zéro lien entrant nulle part dans le code). Un asset image référencé en fallback (`nightclub-confetti-celebration-crowd.jpg`) n'existe pas dans `public/`, un bug déjà signalé le 2026-05-08 et toujours vrai. La home est encore 100% `"use client"` sans découpe de rendu ni `next/dynamic`, ce qui n'est pas dramatique ici vu l'absence de librairie lourde (pas de framer-motion), mais reste un choix architectural non optimal pour une page marketing.

## Niveau "pro" (1-5) avec justification
**3.5 / 5**

- Le pitch (H1 + sous-titre + CTA unique "Rejoindre Nivy") est clair en moins de 5 secondes, un seul CTA primaire répété (hero + CTA final), ton et écran-preuve cohérents. C'est un vrai progrès vs l'ancien score de 5.8/10 documenté dans `docs/vision/audit-frontend-reality/F-EXECUTIVE-REPORT.md`.
- Ce qui plombe la note : le routage des audiences (parent/partenaire/ambassadeur) est **écrit** dans la home (bandeau garanties, section "Parents, vous gardez la main") mais **non maillé** dans le reste du site — un visiteur qui quitte la home puis revient, ou qui arrive par `/partenaires` en direct, n'a aucun chemin de retour vers ces landings depuis la nav globale. Un audit "pro" doit inclure la cohérence de bout en bout, pas seulement l'écran d'accueil isolé.
- SEO : les 2 pages historiques du périmètre (`a-propos`, `temoignages`) n'ont **aucune metadata dédiée** → titres/descriptions dupliqués depuis le layout racine, absence dans le sitemap.

## Données : statique/mocké vs API réelle
| Élément | Source actuelle | Devrait être |
| ------- | --------------- | ------------ |
| `upcomingEvents` (`app/page.tsx:49-85`) | **Réel** — `supabase.from("events").select("*").gte("event_date", now).limit(3)`, avec skeleton (`eventsLoading`) et bandeau d'erreur (`eventsError`), et `NivEmpty` si `upcomingEvents.length === 0` | OK tel quel — c'est le seul flux dynamique de la home et il est bien géré (chargement/erreur/vide) |
| `AdoScreen` / `ParentScreen` (`app/page.tsx:772-838`) | **Mock assumé et documenté** — "écran produit réel" en commentaire mais chiffres en dur (2 480 XP, 12 500 coins, "Amine", "Khadija") | OK en l'état : usage marketing explicite (mockup téléphone), pas de risque de confusion car non connecté à un compte réel. Aucune action requise, juste garder l'étiquette "illustration" implicite |
| `MARQUEE_CATEGORIES`, `DO_THINGS`, `NIV_USES`, `CREW_FEATURES`, `HOW_STEPS`, `PARENT_CONTROLS`, `PARENT_COMPLIANCE`, `FAQ` (`app/page.tsx:604-735`) | Statique par design (vitrine), commentaire explicite "pas d'enseignes inventées" | OK — c'est du contenu éditorial assumé, pas des données produit maquillées en réel |
| `testimonials` (`app/temoignages/page.tsx:14-27`) | **Réel** — `supabase.from("testimonials").where(approved=true)`, empty-state honnête si aucune ligne | OK, remédié depuis l'ancien audit (plus de fausses notes 5 étoiles) |
| `event.image_url` fallback (`app/page.tsx:205`) | Pointe vers `/nightclub-confetti-celebration-crowd.jpg`, **fichier absent de `public/`** | CASSÉ — fournir l'asset ou changer le fallback vers un asset existant (ex. un visuel de la charte paper) |
| Tarifs `/parents` (`app/parents/page.tsx:85-134`) | Statique en dur (Free/Silver/Gold/Platinum, prix DH) | Admissible en V1 tant qu'aucun moteur de facturation n'existe, mais à surveiller : aucune source unique équivalente à `getEscrowConfig()` pour les prix — risque de drift si les tarifs changent ailleurs (ex. `carte-vip`) |

## Cohérence avec le reste de l'app
- **Escrow / conformité** : source unique bien respectée — `getEscrowConfig()` utilisée de façon identique dans `app/page.tsx`, `app/layout.tsx` (JSON-LD FAQPage), `components/trust-banner.tsx`, `app/parents/page.tsx`. Aucun texte d'escrow en dur trouvé ailleurs dans le périmètre. C'est le point le plus solide de cet audit.
- **Taxonomie 4 piliers** : Navbar (`components/navbar.tsx:118-183`), Footer (`components/footer.tsx:19-57`) et home (`DO_THINGS`, `app/page.tsx:619-660`) utilisent la même taxonomie "Sport & clubs / Études / Création / Sorties & crew" — cohérent, contrairement à l'incohérence "party/vitality/intellect/prestige vs creativity" relevée dans l'ancien audit du 2026-05-08 (désormais corrigée).
- **`TrustBanner` orphelin de la home** : le composant existe et est utilisé dans `/guide-parents` et `/securite`, mais **pas importé dans `app/page.tsx`** — la home a sa propre section "Barrière de garantie parent" dupliquée en JSX inline (`app/page.tsx:144-162`) avec des items différents (Wallet/Ban/RotateCcw) de ceux de `TrustBanner` (Shield/Award/Lock). Deux composants qui disent presque la même chose avec des libellés différents = dette de duplication, pas un bug fonctionnel.
- **`/parents` et `/partenaires` invisibles du reste du site** : liés uniquement depuis `app/page.tsx` (`/parents` : lignes 498, 587 — 2 CTA) et depuis `components/footer.tsx:42` pour `/partenaires` uniquement ("Vous êtes un commerce ?"). Aucune des deux pages n'est dans `components/navbar.tsx`, et seule `/partenaires` est dans le footer. `/parents` n'a **aucun lien entrant** hors la home elle-même.
- **`/temoignages`** : recherche exhaustive (`grep -r "temoignages" **/*.tsx`) — zéro résultat hors le fichier lui-même. Page 100 % orpheline, ni navbar, ni footer, ni home, ni sitemap.
- **Sitemap** (`app/sitemap.ts`) ne référence ni `/parents`, ni `/partenaires`, ni `/a-propos`, ni `/temoignages` — seuls `/`, `/agenda`, `/clubs`, `/carte-vip`, `/devenir-ambassadeur`, `/devenir-partenaire`, `/communaute`, 3 pages légales et les URLs d'événements y figurent.
- **`components/features/home/home-events-section.tsx`** : composant mort — logique quasi-identique à la section "Agenda live" inlinée dans `app/page.tsx`, mais avec du contenu clairement pré-refonte ("Prochaines Activités", "Clubs en vedette", témoignage en dur "Amina L., 16 ans... grâce à Teen Party"). N'est importé nulle part (vérifié : aucun autre fichier ne l'utilise) — candidat sûr à suppression.

## Gaps bloquants (P0)
- **P0-1 [CASSÉ]** Image de fallback événement introuvable : `app/page.tsx:205` référence `/nightclub-confetti-celebration-crowd.jpg`, absente de `public/`. Dès qu'un événement réel n'a pas de `image_url` renseigné (cas courant en debut de beta), l'image casse (404 silencieux avec `next/image`, ou icône brisée). Déjà signalé le 2026-05-08 (`F-EXECUTIVE-REPORT.md` ticket B2), jamais corrigé, juste déplacé du composant mort vers `page.tsx`.
- **P0-2 [MANQUANT vs standard pro]** `/parents` est un cul-de-sac de navigation : aucun lien entrant depuis navbar, footer ou sitemap. Un visiteur qui arrive dessus par un partage de lien ou qui revient plus tard sur le site n'a plus aucun chemin pour la retrouver — seule la home y renvoie. Pour une landing "audience parent" censée rassurer et convertir, c'est un gap de découvrabilité majeur.
- **P0-3 [MANQUANT vs standard pro]** `/temoignages` est totalement orpheline (zéro lien entrant, absente du sitemap). Une page de preuve sociale qui n'est jamais linkée nulle part n'apporte aucune valeur de conversion — elle existe mais est invisible.

## Gaps importants (P1)
- **P1-1 [DETTE/doublon]** Duplication de la bannière de confiance : `components/trust-banner.tsx` (Shield/Award/Lock) vs section inline dans `app/page.tsx:144-162` (Wallet/Ban/RotateCcw). Deux implémentations différentes du même besoin de réassurance, avec des items différents — à consolider en un seul composant paramétrable.
- **P1-2 [DETTE/doublon]** `components/features/home/home-events-section.tsx` est un fichier mort (non importé) contenant du contenu pré-refonte (marque "Teen Party", témoignage en dur, structure "Clubs en vedette" disparue de la home actuelle). Non exécuté donc non dangereux, mais pollue la codebase et peut induire un futur agent en erreur (comme faillit le faire cet audit avant vérification du "found no matches" pour son usage).
- **P1-3 [MANQUANT vs standard pro]** `/a-propos` et `/temoignages` n'ont **aucun `export const metadata`** — elles héritent du titre/description génériques du layout racine ("Nivy — L'écosystème lifestyle gamifié...") au lieu d'un titre spécifique. Impact SEO : titres dupliqués en indexation, mauvais snippet Google pour ces pages. `/parents` et `/partenaires`, elles, ont bien leur propre `metadata` (bon exemple à répliquer).
- **P1-4 [MANQUANT vs standard pro]** `next/image` sur la carte événement (`app/page.tsx:204-209`) n'a pas de prop `sizes` alors que l'image est dans une grille responsive (`md:grid-cols-3`) — risque de téléchargement d'image surdimensionnée sur mobile, dégradant le LCP/poids réseau sur un marché où la 3G/4G moyenne est un facteur (Maroc).
- **P1-5 [MANQUANT vs standard pro]** Aucun CTA "je suis un partenaire" ni "je veux devenir ambassadeur" nulle part sur la home (`app/page.tsx`) — recherche exhaustive confirmée. Les 3 audiences B2B/B2B2C (partenaire, ambassadeur, influenceur) n'ont **aucun point d'entrée visible** depuis la page la plus visitée du site ; elles ne sont accessibles que via le footer (colonne "Collabore", en bas de page, peu visible).

## Polish (P2)
- **P2-1 [DETTE]** Home 100% `"use client"` sans aucune section server/streamée ni `next/dynamic` — pas critique ici (pas de librairie lourde importée, pas de framer-motion), mais un futur ajout (ex. carrousel de témoignages, chat widget) alourdira le bundle client sans garde-fou existant.
- **P2-2 [DETTE mineure]** Incohérence i18n : `Navbar`/`Footer` utilisent `useT()` pour quelques libellés (`nav.login`, `footer.copyright`...) alors que 100% du texte de `app/page.tsx` est câblé en dur en français. Ceci est cohérent avec la politique documentée "V1 FR-only" (`lib/i18n/types.ts:11-16`) donc ce n'est pas un bug, juste une incohérence de méthode entre composants partagés (traduits) et pages (non traduites) qui compliquera l'activation d'AR/Darija/EN plus tard.
- **P2-3 [POLISH]** `og-image.jpg` existe et fait bien 1200×630 (vérifié), mais rien ne garantit qu'il reflète le contenu V10 (écrans ado/parent) — pas de vérification visuelle possible sans rendu, à valider manuellement une fois avant tout partage sur les réseaux.
- **P2-4 [POLISH]** `alt` sur les avatars du mockup téléphone (`ScreenKid`, `app/page.tsx:800-813`) : les initiales ("A", "K", "Y") sont dans des `<span aria-hidden="true">`, bon réflexe, mais le nom complet n'est disponible qu'en texte visible adjacent (`name`) — c'est correct pour un lecteur d'écran (le texte parle pour lui-même), aucune action requise, juste noté comme bonne pratique confirmée.
- **P2-5 [POLISH]** `app/manifest.ts` a `theme_color: "#06b6d4"` (cyan) qui ne correspond à aucun token visible de la charte paper actuelle (pink `#ff3d80`, lime, gold, coral) — reliquat probable d'une itération de marque antérieure (cyan ressemble à l'ancien thème "Teens Party"). À aligner avec `viewport.themeColor` dans `app/layout.tsx:149-152` qui utilise déjà les bonnes valeurs paper/night.

## Effort estimé (S/M/L par gap)
| Gap | Effort |
| --- | --- |
| P0-1 — Asset image fallback manquant | S (0.5 j-h : fournir l'asset ou changer le fallback vers un fichier existant de `public/`) |
| P0-2 — `/parents` sans maillage | S (0.5 j-h : ajouter un lien navbar ou footer + entrée sitemap) |
| P0-3 — `/temoignages` orpheline | S (0.5 j-h : lien footer "Confiance" + entrée sitemap, ou supprimer la page si non prioritaire) |
| P1-1 — Doublon TrustBanner vs bannière inline | M (1 j-h : fusionner en un seul composant paramétrable) |
| P1-2 — Fichier mort `home-events-section.tsx` | S (0.25 j-h : suppression après grep de confirmation, déjà fait dans cet audit) |
| P1-3 — Metadata manquante `a-propos`/`temoignages` | S (0.5 j-h : 2 exports `metadata` à ajouter) |
| P1-4 — `sizes` manquant sur `next/image` | S (0.25 j-h) |
| P1-5 — Aucun CTA partenaire/ambassadeur sur la home | M (1 j-h : décision produit + ajout d'un bloc ou lien visible) |
| P2-1 à P2-5 | S chacun (0.25–0.5 j-h) |

## Fichiers critiques à connaître
- `app/page.tsx` — homepage V10, hero + agenda live + FAQ + CTA parent ; ligne 205 = bug asset ; lignes 144-162 = doublon TrustBanner
- `components/trust-banner.tsx` — utilisé seulement par `/guide-parents` et `/securite`, pas par la home
- `app/parents/page.tsx`, `app/partenaires/page.tsx` — landings V10 orphelines de la nav globale
- `app/temoignages/page.tsx` — remédiée côté data (Supabase réel + empty state honnête) mais orpheline de tout maillage
- `app/a-propos/page.tsx` — contenu correct, metadata manquante
- `components/navbar.tsx` — taxonomie 4 piliers, aucune entrée parent/partenaire/ambassadeur
- `components/footer.tsx` — seul point d'entrée pour `/partenaires`/`/devenir-ambassadeur`, colonne "Collabore" lignes 39-48
- `app/sitemap.ts` — absence de `/parents`, `/partenaires`, `/a-propos`, `/temoignages`
- `app/manifest.ts` — `theme_color` cyan désaligné de la charte
- `components/features/home/home-events-section.tsx` — fichier mort à supprimer
- `lib/config/app-config.ts` — `getEscrowConfig()`/`getPublicAppConfig()`, source unique bien respectée partout dans le périmètre
- `docs/vision/audit-frontend-reality/F-EXECUTIVE-REPORT.md` — audit antérieur (2026-05-08) confirmant que le bug d'asset (B2) et le manque de metadata (D13) sont connus de longue date et non résolus
